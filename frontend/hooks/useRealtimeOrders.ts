import { useReducer, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

// Types
export interface FuelOrder {
  id: number;
  aircraft_registration: string;
  gallons_requested: number;
  service_type: string;
  fuel_type: string;
  priority: 'HIGH' | 'NORMAL' | 'LOW';
  status: 'Dispatched' | 'Acknowledged' | 'En Route' | 'Fueling' | 'Completed';
  assigned_to_id?: number;
  change_version: number;
  gallons_dispensed?: number;
  start_meter_reading?: number;
  end_meter_reading?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  customer_name?: string;
  tail_number?: string;
  // UI state
  isQueued?: boolean;
  isSyncFailed?: boolean;
  errorMessage?: string;
}

export interface Command {
  id: string;
  type: 'CLAIM_ORDER' | 'UPDATE_STATUS' | 'ACKNOWLEDGE_CHANGE' | 'COMPLETE_ORDER';
  payload: any;
  timestamp: number;
  retries: number;
}

interface OrdersState {
  availableOrders: FuelOrder[];
  myQueue: FuelOrder[];
  inProgress: FuelOrder[];
  completedToday: FuelOrder[];
  connectionStatus: 'CONNECTED' | 'RECONNECTING' | 'DISCONNECTED';
  actionQueue: Command[];
  isLoading: boolean;
  lastSync: number | null;
}

type OrdersAction = 
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_CONNECTION_STATUS'; payload: OrdersState['connectionStatus'] }
  | { type: 'INITIAL_LOAD'; payload: { orders: FuelOrder[]; userId: number } }
  | { type: 'NEW_ORDER'; payload: FuelOrder }
  | { type: 'ORDER_CLAIMED'; payload: { orderId: number; userId: number } }
  | { type: 'ORDER_UPDATED'; payload: FuelOrder }
  | { type: 'ORDER_COMPLETED'; payload: FuelOrder }
  | { type: 'OPTIMISTIC_CLAIM'; payload: { orderId: number; command: Command } }
  | { type: 'OPTIMISTIC_STATUS_UPDATE'; payload: { orderId: number; status: FuelOrder['status']; command: Command } }
  | { type: 'OPTIMISTIC_COMPLETE'; payload: { orderId: number; data: any; command: Command } }
  | { type: 'SYNC_SUCCESS'; payload: { commandId: string; result?: any } }
  | { type: 'SYNC_FAILED'; payload: { commandId: string; error: string } }
  | { type: 'ADD_TO_QUEUE'; payload: Command }
  | { type: 'REMOVE_FROM_QUEUE'; payload: string }
  | { type: 'REVERT_OPTIMISTIC_UPDATE'; payload: { orderId: number; commandId: string } }
  | { type: 'CLEAR_ORDER_ERROR'; payload: number }
  | { type: 'SET_LAST_SYNC'; payload: number };

const initialState: OrdersState = {
  availableOrders: [],
  myQueue: [],
  inProgress: [],
  completedToday: [],
  connectionStatus: 'DISCONNECTED',
  actionQueue: [],
  isLoading: false,
  lastSync: null,
};

function ordersReducer(state: OrdersState, action: OrdersAction): OrdersState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };

    case 'SET_CONNECTION_STATUS':
      return { ...state, connectionStatus: action.payload };

    case 'INITIAL_LOAD': {
      const { orders, userId } = action.payload;
      
      return {
        ...state,
        availableOrders: orders.filter(o => o.status === 'Dispatched' && !o.assigned_to_id),
        myQueue: orders.filter(o => o.assigned_to_id === userId && o.status === 'Acknowledged'),
        inProgress: orders.filter(o => o.assigned_to_id === userId && ['En Route', 'Fueling'].includes(o.status)),
        completedToday: orders.filter(o => o.status === 'Completed' && isToday(o.updated_at)),
        isLoading: false,
        lastSync: Date.now(),
      };
    }

    case 'NEW_ORDER': {
      if (action.payload.status === 'Dispatched' && !action.payload.assigned_to_id) {
        return {
          ...state,
          availableOrders: [action.payload, ...state.availableOrders],
        };
      }
      return state;
    }

    case 'ORDER_CLAIMED': {
      const { orderId, userId } = action.payload;
      const order = findOrderInAllColumns(state, orderId);
      
      if (!order) return state;

      // Remove from available orders
      const availableOrders = state.availableOrders.filter(o => o.id !== orderId);
      
      // Add to appropriate column based on current user
      let myQueue = state.myQueue;
      if (order.assigned_to_id === userId) {
        myQueue = [{ ...order, status: 'Acknowledged' as const }, ...state.myQueue];
      }

      return {
        ...state,
        availableOrders,
        myQueue,
      };
    }

    case 'ORDER_UPDATED': {
      const updatedOrder = action.payload;
      return updateOrderInState(state, updatedOrder);
    }

    case 'ORDER_COMPLETED': {
      const completedOrder = action.payload;
      return moveOrderToColumn(state, completedOrder.id, 'completedToday', { 
        ...completedOrder, 
        status: 'Completed' as const 
      });
    }

    case 'OPTIMISTIC_CLAIM': {
      const { orderId, command } = action.payload;
      const order = state.availableOrders.find(o => o.id === orderId);
      
      if (!order) return state;

      return {
        ...state,
        availableOrders: state.availableOrders.filter(o => o.id !== orderId),
        myQueue: [{ ...order, status: 'Acknowledged' as const, isQueued: true }, ...state.myQueue],
        actionQueue: [...state.actionQueue, command],
      };
    }

    case 'OPTIMISTIC_STATUS_UPDATE': {
      const { orderId, status, command } = action.payload;
      const order = findOrderInAllColumns(state, orderId);
      
      if (!order) return state;

      const updatedOrder = { ...order, status, isQueued: true };
      const newState = updateOrderInState(state, updatedOrder);
      
      return {
        ...newState,
        actionQueue: [...newState.actionQueue, command],
      };
    }

    case 'OPTIMISTIC_COMPLETE': {
      const { orderId, data, command } = action.payload;
      const order = findOrderInAllColumns(state, orderId);
      
      if (!order) return state;

      const completedOrder = { 
        ...order, 
        ...data, 
        status: 'Completed' as const, 
        isQueued: true 
      };
      
      const newState = moveOrderToColumn(state, orderId, 'completedToday', completedOrder);
      
      return {
        ...newState,
        actionQueue: [...newState.actionQueue, command],
      };
    }

    case 'SYNC_SUCCESS': {
      const { commandId } = action.payload;
      const command = state.actionQueue.find(c => c.id === commandId);
      
      if (!command) return state;

      // Remove queued flag from affected order
      const orderId = getOrderIdFromCommand(command);
      if (orderId) {
        const order = findOrderInAllColumns(state, orderId);
        if (order && order.isQueued) {
          const updatedOrder = { ...order, isQueued: false, isSyncFailed: false, errorMessage: undefined };
          const newState = updateOrderInState(state, updatedOrder);
          
          return {
            ...newState,
            actionQueue: newState.actionQueue.filter(c => c.id !== commandId),
            lastSync: Date.now(),
          };
        }
      }

      return {
        ...state,
        actionQueue: state.actionQueue.filter(c => c.id !== commandId),
        lastSync: Date.now(),
      };
    }

    case 'SYNC_FAILED': {
      const { commandId, error } = action.payload;
      const command = state.actionQueue.find(c => c.id === commandId);
      
      if (!command) return state;

      // For permanent failures (4xx errors), revert and mark as failed
      if (error.includes('4')) {
        const orderId = getOrderIdFromCommand(command);
        if (orderId) {
          return revertOptimisticUpdate(state, orderId, commandId, error);
        }
      }

      // For temporary failures, increment retry count
      return {
        ...state,
        actionQueue: state.actionQueue.map(c => 
          c.id === commandId 
            ? { ...c, retries: c.retries + 1 }
            : c
        ),
      };
    }

    case 'REVERT_OPTIMISTIC_UPDATE': {
      const { orderId, commandId } = action.payload;
      return revertOptimisticUpdate(state, orderId, commandId);
    }

    case 'CLEAR_ORDER_ERROR': {
      const orderId = action.payload;
      const order = findOrderInAllColumns(state, orderId);
      
      if (order && order.isSyncFailed) {
        const updatedOrder = { ...order, isSyncFailed: false, errorMessage: undefined };
        return updateOrderInState(state, updatedOrder);
      }
      
      return state;
    }

    case 'ADD_TO_QUEUE':
      return {
        ...state,
        actionQueue: [...state.actionQueue, action.payload],
      };

    case 'REMOVE_FROM_QUEUE':
      return {
        ...state,
        actionQueue: state.actionQueue.filter(c => c.id !== action.payload),
      };

    case 'SET_LAST_SYNC':
      return {
        ...state,
        lastSync: action.payload,
      };

    default:
      return state;
  }
}

// Helper functions
function isToday(dateString: string): boolean {
  const date = new Date(dateString);
  const today = new Date();
  return date.toDateString() === today.toDateString();
}

function findOrderInAllColumns(state: OrdersState, orderId: number): FuelOrder | undefined {
  return [...state.availableOrders, ...state.myQueue, ...state.inProgress, ...state.completedToday]
    .find(o => o.id === orderId);
}

function updateOrderInState(state: OrdersState, updatedOrder: FuelOrder): OrdersState {
  const columns = ['availableOrders', 'myQueue', 'inProgress', 'completedToday'] as const;
  const newState = { ...state };
  
  columns.forEach(column => {
    newState[column] = state[column].map(order => 
      order.id === updatedOrder.id ? updatedOrder : order
    );
  });
  
  return newState;
}

function moveOrderToColumn(state: OrdersState, orderId: number, targetColumn: keyof OrdersState, updatedOrder?: FuelOrder): OrdersState {
  const columns = ['availableOrders', 'myQueue', 'inProgress', 'completedToday'] as const;
  const newState = { ...state };
  let orderToMove: FuelOrder | undefined;

  // Remove from current column
  columns.forEach(column => {
    const index = state[column].findIndex(o => o.id === orderId);
    if (index !== -1) {
      orderToMove = state[column][index];
      newState[column] = state[column].filter(o => o.id !== orderId);
    }
  });

  // Add to target column
  if (orderToMove && targetColumn in newState) {
    const finalOrder = updatedOrder || orderToMove;
    (newState[targetColumn] as FuelOrder[]) = [finalOrder, ...(newState[targetColumn] as FuelOrder[])];
  }

  return newState;
}

function getOrderIdFromCommand(command: Command): number | null {
  switch (command.type) {
    case 'CLAIM_ORDER':
    case 'UPDATE_STATUS':
    case 'ACKNOWLEDGE_CHANGE':
    case 'COMPLETE_ORDER':
      return command.payload.orderId || null;
    default:
      return null;
  }
}

function revertOptimisticUpdate(state: OrdersState, orderId: number, commandId: string, error?: string): OrdersState {
  const command = state.actionQueue.find(c => c.id === commandId);
  if (!command) return state;

  const order = findOrderInAllColumns(state, orderId);
  if (!order) return state;

  // Mark order as sync failed
  const failedOrder = { 
    ...order, 
    isQueued: false, 
    isSyncFailed: true, 
    errorMessage: error || 'Sync failed' 
  };

  const newState = updateOrderInState(state, failedOrder);
  
  return {
    ...newState,
    actionQueue: newState.actionQueue.filter(c => c.id !== commandId),
  };
}

// Main hook
export function useRealtimeOrders(userId: number) {
  const [state, dispatch] = useReducer(ordersReducer, initialState);
  const socketRef = useRef<Socket | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Generate unique command ID
  const generateCommandId = useCallback(() => {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // API calls
  const apiCall = useCallback(async (endpoint: string, options: RequestInit = {}) => {
    // Get token from the same localStorage key the frontend uses
    const userData = localStorage.getItem('fboUser');
    let token = null;
    if (userData) {
      try {
        const user = JSON.parse(userData);
        token = user.access_token;
      } catch (e) {
        console.error('Error parsing user data:', e);
      }
    }
    
    const response = await fetch(`/api${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }, []);

  // Sync queued actions
  const syncQueuedActions = useCallback(async () => {
    if (state.actionQueue.length === 0) return;

    for (const command of state.actionQueue) {
      try {
        let result;
        
        switch (command.type) {
          case 'CLAIM_ORDER':
            result = await apiCall(`/fuel-orders/${command.payload.orderId}/status`, {
              method: 'PATCH',
              body: JSON.stringify({ status: 'ACKNOWLEDGED' }),
            });
            break;
            
          case 'UPDATE_STATUS':
            result = await apiCall(`/fuel-orders/${command.payload.orderId}/status`, {
              method: 'PATCH',
              body: JSON.stringify({ status: command.payload.status }),
            });
            break;
            
          case 'ACKNOWLEDGE_CHANGE':
            result = await apiCall(`/fuel-orders/${command.payload.orderId}/acknowledge-change`, {
              method: 'POST',
              body: JSON.stringify({ change_version: command.payload.changeVersion }),
            });
            break;
            
          case 'COMPLETE_ORDER':
            result = await apiCall(`/fuel-orders/${command.payload.orderId}/submit-data`, {
              method: 'PUT',
              body: JSON.stringify(command.payload.data),
            });
            break;
        }

        dispatch({ type: 'SYNC_SUCCESS', payload: { commandId: command.id, result } });
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        // If max retries reached or 4xx error, mark as failed
        if (command.retries >= 3 || errorMessage.includes('4')) {
          dispatch({ type: 'SYNC_FAILED', payload: { commandId: command.id, error: errorMessage } });
        } else {
          dispatch({ type: 'SYNC_FAILED', payload: { commandId: command.id, error: errorMessage } });
        }
      }
    }
  }, [state.actionQueue, apiCall]);

  // Function to sync actions on reconnect
  const syncOnReconnect = useCallback(() => {
    if (state.actionQueue.length > 0) {
      console.log('Syncing queued actions on reconnect:', state.actionQueue.length);
      syncQueuedActions();
    }
  }, [state.actionQueue, syncQueuedActions]);

  // Load initial data
  const loadInitialData = useCallback(async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    
    try {
      const response = await apiCall('/fuel-orders');
      // Extract orders array from the response object
      const orders = response.orders || [];
      dispatch({ type: 'INITIAL_LOAD', payload: { orders, userId } });
    } catch (error) {
      console.error('Failed to load initial data:', error);
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [apiCall, userId]);

  // Refresh data manually
  const refreshData = useCallback(async () => {
    await loadInitialData();
  }, [loadInitialData]);

  // Socket connection and event handlers
  useEffect(() => {
    // Get token from the same localStorage key the frontend uses
    const userData = localStorage.getItem('fboUser');
    let token = null;
    if (userData) {
      try {
        const user = JSON.parse(userData);
        token = user.access_token;
      } catch (e) {
        console.error('Error parsing user data:', e);
      }
    }
    if (!token) return;

    // Use environment variable or fallback to localhost
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5001';
    const socket = io(socketUrl, {
      query: { token },
      transports: ['polling', 'websocket'], // Start with polling, upgrade to websocket
      upgrade: true,
      rememberUpgrade: false,
      forceNew: false, // Allow connection reuse
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 10, // Increased from 3
      timeout: 30000, // Increased from 20000
      autoConnect: true,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Socket.IO connected successfully');
      dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'CONNECTED' });
    });

    socket.on('disconnect', (reason) => {
      console.log('Socket.IO disconnected:', reason);
      dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'RECONNECTING' });
    });

    socket.on('connect_error', (error) => {
      console.error('Socket.IO connection error:', error);
      dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'RECONNECTING' });
    });

    socket.on('reconnect', (attemptNumber) => {
      console.log('Socket.IO reconnected after', attemptNumber, 'attempts');
      dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'CONNECTED' });
    });

    socket.on('reconnect_error', (error) => {
      console.error('Socket.IO reconnection error:', error);
    });

    socket.on('reconnect_failed', () => {
      console.error('Socket.IO reconnection failed');
      dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'DISCONNECTED' });
    });

    socket.on('new_unclaimed_order', (order: FuelOrder) => {
      dispatch({ type: 'NEW_ORDER', payload: order });
    });

    socket.on('order_claimed', (data: { orderId: number; userId: number }) => {
      dispatch({ type: 'ORDER_CLAIMED', payload: data });
    });

    socket.on('order_update', (order: FuelOrder) => {
      dispatch({ type: 'ORDER_UPDATED', payload: order });
    });

    socket.on('order_completed', (order: FuelOrder) => {
      dispatch({ type: 'ORDER_COMPLETED', payload: order });
    });

    socket.on('order_details_updated', (order: FuelOrder) => {
      dispatch({ type: 'ORDER_UPDATED', payload: order });
    });

    return () => {
      socket.disconnect();
    };
  }, [userId]); // Removed syncQueuedActions from dependencies

  // Sync actions when connection is established
  useEffect(() => {
    if (state.connectionStatus === 'CONNECTED' && state.actionQueue.length > 0) {
      console.log('Connection established, syncing queued actions:', state.actionQueue.length);
      syncQueuedActions();
    }
  }, [state.connectionStatus, syncQueuedActions]);

  // Periodic sync of queued actions
  useEffect(() => {
    if (state.connectionStatus === 'CONNECTED' && state.actionQueue.length > 0) {
      syncIntervalRef.current = setInterval(syncQueuedActions, 5000);
    } else if (syncIntervalRef.current) {
      clearInterval(syncIntervalRef.current);
      syncIntervalRef.current = null;
    }

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, [state.connectionStatus, state.actionQueue.length, syncQueuedActions]);

  // Load initial data on mount
  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Action functions
  const claimOrder = useCallback((orderId: number) => {
    const command: Command = {
      id: generateCommandId(),
      type: 'CLAIM_ORDER',
      payload: { orderId },
      timestamp: Date.now(),
      retries: 0,
    };

    dispatch({ type: 'OPTIMISTIC_CLAIM', payload: { orderId, command } });
  }, [generateCommandId]);

  const updateOrderStatus = useCallback((orderId: number, status: FuelOrder['status']) => {
    const command: Command = {
      id: generateCommandId(),
      type: 'UPDATE_STATUS',
      payload: { orderId, status },
      timestamp: Date.now(),
      retries: 0,
    };

    dispatch({ type: 'OPTIMISTIC_STATUS_UPDATE', payload: { orderId, status, command } });
  }, [generateCommandId]);

  const acknowledgeChange = useCallback((orderId: number, changeVersion: number) => {
    const command: Command = {
      id: generateCommandId(),
      type: 'ACKNOWLEDGE_CHANGE',
      payload: { orderId, changeVersion },
      timestamp: Date.now(),
      retries: 0,
    };

    dispatch({ type: 'ADD_TO_QUEUE', payload: command });
  }, [generateCommandId]);

  const completeOrder = useCallback((orderId: number, data: any) => {
    const command: Command = {
      id: generateCommandId(),
      type: 'COMPLETE_ORDER',
      payload: { orderId, data },
      timestamp: Date.now(),
      retries: 0,
    };

    dispatch({ type: 'OPTIMISTIC_COMPLETE', payload: { orderId, data, command } });
  }, [generateCommandId]);

  const clearOrderError = useCallback((orderId: number) => {
    dispatch({ type: 'CLEAR_ORDER_ERROR', payload: orderId });
  }, []);

  return {
    ...state,
    actions: {
      claimOrder,
      updateOrderStatus,
      acknowledgeChange,
      completeOrder,
      clearOrderError,
      refreshData,
    },
  };
} 