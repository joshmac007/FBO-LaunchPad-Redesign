import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi, describe, it, expect, beforeEach, afterEach, Mock } from 'vitest';
import AircraftLookup from '../../app/components/aircraft-lookup';
import * as aircraftService from '../../app/services/aircraft-service';
import { Aircraft } from '../../app/services/aircraft-service';

// Mock the aircraft service
vi.mock('../../app/services/aircraft-service', async () => {
  const actual = await vi.importActual('../../app/services/aircraft-service');
  return {
    ...actual, // Import actual implementations for types
    getAircraftByTailNumber: vi.fn(),
  };
});

const mockAircraft: Aircraft = {
  id: 1,
  tailNumber: 'N12345',
  type: 'Jet',
  model: 'Gulfstream G650',
  owner: 'Executive Aviation LLC',
  homeBase: 'KJFK',
  status: 'active',
  fuelCapacity: 6500,
  preferredFuelType: 'Jet A',
  mtow: 99600,
  lastFaaSyncAt: '2023-05-01T12:00:00Z',
};

describe('AircraftLookup Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers(); // Use fake timers for debounce testing
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers(); // Restore real timers
  });

  // --- Initial Render ---
  it('renders input field and "Lookup" button', () => {
    render(<AircraftLookup />);
    expect(screen.getByLabelText(/Aircraft Tail Number/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Lookup/i })).toBeInTheDocument();
  });

  // --- Search Input and Button Click ---
  it('user types in input, value changes, and clicking "Lookup" calls getAircraftByTailNumber', async () => {
    (aircraftService.getAircraftByTailNumber as Mock).mockResolvedValueOnce(mockAircraft);
    render(<AircraftLookup />);
    const input = screen.getByLabelText(/Aircraft Tail Number/i);
    const lookupButton = screen.getByRole('button', { name: /Lookup/i });

    fireEvent.change(input, { target: { value: 'N123' } });
    expect(input).toHaveValue('N123');

    fireEvent.click(lookupButton);

    await waitFor(() => {
      expect(aircraftService.getAircraftByTailNumber).toHaveBeenCalledWith('N123');
    });
  });

  // --- Debounce Logic ---
  it('debounces the getAircraftByTailNumber call when typing', async () => {
    (aircraftService.getAircraftByTailNumber as Mock).mockResolvedValueOnce(mockAircraft);
    render(<AircraftLookup />);
    const input = screen.getByLabelText(/Aircraft Tail Number/i);

    fireEvent.change(input, { target: { value: 'N1' } });
    fireEvent.change(input, { target: { value: 'N12' } });
    // lookupTriggered is set to true on change, so debounce starts
    
    // Should not be called immediately
    expect(aircraftService.getAircraftByTailNumber).not.toHaveBeenCalled();

    // Advance timers by debounce duration (800ms in component)
    vi.advanceTimersByTime(800);

    await waitFor(() => {
      expect(aircraftService.getAircraftByTailNumber).toHaveBeenCalledWith('N12');
    });

    // Type again
    fireEvent.change(input, { target: { value: 'N123' } });
    expect(aircraftService.getAircraftByTailNumber).toHaveBeenCalledTimes(1); // Still 1 from previous call

    vi.advanceTimersByTime(800);
    await waitFor(() => {
      expect(aircraftService.getAircraftByTailNumber).toHaveBeenCalledWith('N123');
      expect(aircraftService.getAircraftByTailNumber).toHaveBeenCalledTimes(2);
    });
  });
  
  // --- Successful Lookup ---
  it('displays aircraft details and calls onAircraftFound on successful lookup', async () => {
    (aircraftService.getAircraftByTailNumber as Mock).mockResolvedValueOnce(mockAircraft);
    const mockOnAircraftFound = vi.fn();
    render(<AircraftLookup onAircraftFound={mockOnAircraftFound} />);
    const input = screen.getByLabelText(/Aircraft Tail Number/i);
    const lookupButton = screen.getByRole('button', { name: /Lookup/i });

    fireEvent.change(input, { target: { value: 'N12345' } });
    fireEvent.click(lookupButton);

    await waitFor(() => {
      expect(screen.getByText(mockAircraft.tailNumber)).toBeInTheDocument();
      expect(screen.getByText(mockAircraft.type)).toBeInTheDocument();
      expect(screen.getByText(mockAircraft.model)).toBeInTheDocument();
      expect(screen.getByText(mockAircraft.owner)).toBeInTheDocument();
      expect(mockOnAircraftFound).toHaveBeenCalledWith(mockAircraft);
    });
  });

  // --- Aircraft Not Found (Service returns null) ---
  it('displays "not found" message if service returns null and does not call onAircraftFound', async () => {
    (aircraftService.getAircraftByTailNumber as Mock).mockResolvedValueOnce(null);
    const mockOnAircraftFound = vi.fn();
    render(<AircraftLookup onAircraftFound={mockOnAircraftFound} />);
    const input = screen.getByLabelText(/Aircraft Tail Number/i);
    const lookupButton = screen.getByRole('button', { name: /Lookup/i });

    fireEvent.change(input, { target: { value: 'N00000' } });
    fireEvent.click(lookupButton);

    await waitFor(() => {
      expect(screen.getByText(/Failed to find aircraft/i)).toBeInTheDocument();
      expect(mockOnAircraftFound).not.toHaveBeenCalled();
    });
  });

  // --- API Error ---
  it('displays error message if getAircraftByTailNumber rejects', async () => {
    (aircraftService.getAircraftByTailNumber as Mock).mockRejectedValueOnce(new Error('Network Error'));
    render(<AircraftLookup />);
    const input = screen.getByLabelText(/Aircraft Tail Number/i);
    const lookupButton = screen.getByRole('button', { name: /Lookup/i });

    fireEvent.change(input, { target: { value: 'NERROR' } });
    fireEvent.click(lookupButton);

    await waitFor(() => {
      expect(screen.getByText(/Failed to find aircraft/i)).toBeInTheDocument();
    });
  });

  // --- Loading State ---
  it('shows loading indicator during API call and hides it after completion', async () => {
    (aircraftService.getAircraftByTailNumber as Mock).mockImplementationOnce(
      () => new Promise(resolve => setTimeout(() => resolve(mockAircraft), 100))
    );
    render(<AircraftLookup />);
    const input = screen.getByLabelText(/Aircraft Tail Number/i);
    const lookupButton = screen.getByRole('button', { name: /Lookup/i });

    fireEvent.change(input, { target: { value: 'NLOAD' } });
    fireEvent.click(lookupButton);

    // Check for loader icon (Lucide icons might not have accessible name by default)
    // We can check if the button text changes or if a specific loader element appears
    expect(screen.getByRole('button', { name: /Searching.../i })).toBeInTheDocument();
    // Or, if the loader icon itself has a test ID or a specific class/structure to query
    // For example, if Loader2 is the only SVG after input, or has a specific role/aria attribute.
    // A simple check for the button text change is often sufficient.

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /Searching.../i })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Lookup/i })).toBeInTheDocument();
      expect(screen.getByText(mockAircraft.tailNumber)).toBeInTheDocument(); // Ensure data is displayed
    });
  });
});
