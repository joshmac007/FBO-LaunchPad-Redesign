--
-- PostgreSQL database dump
--

-- Dumped from database version 15.12 (Debian 15.12-1.pgdg120+1)
-- Dumped by pg_dump version 15.12 (Debian 15.12-1.pgdg120+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: calculationbasis; Type: TYPE; Schema: public; Owner: fbo_user
--

CREATE TYPE public.calculationbasis AS ENUM (
    'FIXED_PRICE',
    'PER_UNIT_SERVICE',
    'NOT_APPLICABLE'
);


ALTER TYPE public.calculationbasis OWNER TO fbo_user;

--
-- Name: fuelorderpriority; Type: TYPE; Schema: public; Owner: fbo_user
--

CREATE TYPE public.fuelorderpriority AS ENUM (
    'normal',
    'high',
    'urgent',
    'NORMAL',
    'HIGH',
    'LOW'
);


ALTER TYPE public.fuelorderpriority OWNER TO fbo_user;

--
-- Name: fuelorderstatus; Type: TYPE; Schema: public; Owner: fbo_user
--

CREATE TYPE public.fuelorderstatus AS ENUM (
    'DISPATCHED',
    'ACKNOWLEDGED',
    'EN_ROUTE',
    'FUELING',
    'COMPLETED',
    'REVIEWED',
    'CANCELLED'
);


ALTER TYPE public.fuelorderstatus OWNER TO fbo_user;

--
-- Name: fueltypeenum; Type: TYPE; Schema: public; Owner: fbo_user
--

CREATE TYPE public.fueltypeenum AS ENUM (
    'JET_A',
    'AVGAS_100LL',
    'SAF_JET_A'
);


ALTER TYPE public.fueltypeenum OWNER TO fbo_user;

--
-- Name: lineitemtype; Type: TYPE; Schema: public; Owner: fbo_user
--

CREATE TYPE public.lineitemtype AS ENUM (
    'FUEL',
    'FEE',
    'WAIVER',
    'TAX',
    'DISCOUNT'
);


ALTER TYPE public.lineitemtype OWNER TO fbo_user;

--
-- Name: receiptstatus; Type: TYPE; Schema: public; Owner: fbo_user
--

CREATE TYPE public.receiptstatus AS ENUM (
    'DRAFT',
    'GENERATED',
    'PAID',
    'VOID'
);


ALTER TYPE public.receiptstatus OWNER TO fbo_user;

--
-- Name: waiverstrategy; Type: TYPE; Schema: public; Owner: fbo_user
--

CREATE TYPE public.waiverstrategy AS ENUM (
    'NONE',
    'SIMPLE_MULTIPLIER',
    'TIERED_MULTIPLIER'
);


ALTER TYPE public.waiverstrategy OWNER TO fbo_user;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: aircraft; Type: TABLE; Schema: public; Owner: fbo_user
--

CREATE TABLE public.aircraft (
    tail_number character varying(20) NOT NULL,
    aircraft_type character varying(50) NOT NULL,
    fuel_type character varying(20) NOT NULL,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    customer_id integer
);


ALTER TABLE public.aircraft OWNER TO fbo_user;

--
-- Name: aircraft_type_fee_category_mappings; Type: TABLE; Schema: public; Owner: fbo_user
--

CREATE TABLE public.aircraft_type_fee_category_mappings (
    id integer NOT NULL,
    fbo_location_id integer NOT NULL,
    aircraft_type_id integer NOT NULL,
    fee_category_id integer NOT NULL,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


ALTER TABLE public.aircraft_type_fee_category_mappings OWNER TO fbo_user;

--
-- Name: aircraft_type_fee_category_mappings_id_seq; Type: SEQUENCE; Schema: public; Owner: fbo_user
--

CREATE SEQUENCE public.aircraft_type_fee_category_mappings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.aircraft_type_fee_category_mappings_id_seq OWNER TO fbo_user;

--
-- Name: aircraft_type_fee_category_mappings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: fbo_user
--

ALTER SEQUENCE public.aircraft_type_fee_category_mappings_id_seq OWNED BY public.aircraft_type_fee_category_mappings.id;


--
-- Name: aircraft_types; Type: TABLE; Schema: public; Owner: fbo_user
--

CREATE TABLE public.aircraft_types (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    base_min_fuel_gallons_for_waiver numeric(10,2) NOT NULL,
    default_fee_category_id integer,
    default_max_gross_weight_lbs numeric(10,2),
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


ALTER TABLE public.aircraft_types OWNER TO fbo_user;

--
-- Name: aircraft_types_id_seq; Type: SEQUENCE; Schema: public; Owner: fbo_user
--

CREATE SEQUENCE public.aircraft_types_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.aircraft_types_id_seq OWNER TO fbo_user;

--
-- Name: aircraft_types_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: fbo_user
--

ALTER SEQUENCE public.aircraft_types_id_seq OWNED BY public.aircraft_types.id;


--
-- Name: alembic_version; Type: TABLE; Schema: public; Owner: fbo_user
--

CREATE TABLE public.alembic_version (
    version_num character varying(32) NOT NULL
);


ALTER TABLE public.alembic_version OWNER TO fbo_user;

--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: fbo_user
--

CREATE TABLE public.audit_logs (
    id integer NOT NULL,
    user_id integer NOT NULL,
    entity_type character varying(50) NOT NULL,
    entity_id integer NOT NULL,
    action character varying(100) NOT NULL,
    details json,
    "timestamp" timestamp without time zone NOT NULL
);


ALTER TABLE public.audit_logs OWNER TO fbo_user;

--
-- Name: audit_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: fbo_user
--

CREATE SEQUENCE public.audit_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.audit_logs_id_seq OWNER TO fbo_user;

--
-- Name: audit_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: fbo_user
--

ALTER SEQUENCE public.audit_logs_id_seq OWNED BY public.audit_logs.id;


--
-- Name: customers; Type: TABLE; Schema: public; Owner: fbo_user
--

CREATE TABLE public.customers (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    email character varying(120) NOT NULL,
    phone character varying(20),
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    is_placeholder boolean NOT NULL,
    is_caa_member boolean NOT NULL,
    caa_member_id character varying(50)
);


ALTER TABLE public.customers OWNER TO fbo_user;

--
-- Name: customers_id_seq; Type: SEQUENCE; Schema: public; Owner: fbo_user
--

CREATE SEQUENCE public.customers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.customers_id_seq OWNER TO fbo_user;

--
-- Name: customers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: fbo_user
--

ALTER SEQUENCE public.customers_id_seq OWNED BY public.customers.id;


--
-- Name: fbo_aircraft_type_configs; Type: TABLE; Schema: public; Owner: fbo_user
--

CREATE TABLE public.fbo_aircraft_type_configs (
    id integer NOT NULL,
    fbo_location_id integer NOT NULL,
    aircraft_type_id integer NOT NULL,
    base_min_fuel_gallons_for_waiver numeric(10,2) NOT NULL,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


ALTER TABLE public.fbo_aircraft_type_configs OWNER TO fbo_user;

--
-- Name: fbo_aircraft_type_configs_id_seq; Type: SEQUENCE; Schema: public; Owner: fbo_user
--

CREATE SEQUENCE public.fbo_aircraft_type_configs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.fbo_aircraft_type_configs_id_seq OWNER TO fbo_user;

--
-- Name: fbo_aircraft_type_configs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: fbo_user
--

ALTER SEQUENCE public.fbo_aircraft_type_configs_id_seq OWNED BY public.fbo_aircraft_type_configs.id;


--
-- Name: fee_categories; Type: TABLE; Schema: public; Owner: fbo_user
--

CREATE TABLE public.fee_categories (
    id integer NOT NULL,
    fbo_location_id integer NOT NULL,
    name character varying(100) NOT NULL,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


ALTER TABLE public.fee_categories OWNER TO fbo_user;

--
-- Name: fee_categories_id_seq; Type: SEQUENCE; Schema: public; Owner: fbo_user
--

CREATE SEQUENCE public.fee_categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.fee_categories_id_seq OWNER TO fbo_user;

--
-- Name: fee_categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: fbo_user
--

ALTER SEQUENCE public.fee_categories_id_seq OWNED BY public.fee_categories.id;


--
-- Name: fee_rule_overrides; Type: TABLE; Schema: public; Owner: fbo_user
--

CREATE TABLE public.fee_rule_overrides (
    id integer NOT NULL,
    fbo_location_id integer NOT NULL,
    aircraft_type_id integer NOT NULL,
    fee_rule_id integer NOT NULL,
    override_amount numeric(10,2),
    override_caa_amount numeric(10,2),
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


ALTER TABLE public.fee_rule_overrides OWNER TO fbo_user;

--
-- Name: fee_rule_overrides_id_seq; Type: SEQUENCE; Schema: public; Owner: fbo_user
--

CREATE SEQUENCE public.fee_rule_overrides_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.fee_rule_overrides_id_seq OWNER TO fbo_user;

--
-- Name: fee_rule_overrides_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: fbo_user
--

ALTER SEQUENCE public.fee_rule_overrides_id_seq OWNED BY public.fee_rule_overrides.id;


--
-- Name: fee_rules; Type: TABLE; Schema: public; Owner: fbo_user
--

CREATE TABLE public.fee_rules (
    id integer NOT NULL,
    fbo_location_id integer NOT NULL,
    fee_name character varying(100) NOT NULL,
    fee_code character varying(50) NOT NULL,
    applies_to_fee_category_id integer NOT NULL,
    amount numeric(10,2) NOT NULL,
    currency character varying(3) NOT NULL,
    is_taxable boolean NOT NULL,
    is_potentially_waivable_by_fuel_uplift boolean NOT NULL,
    calculation_basis public.calculationbasis NOT NULL,
    waiver_strategy public.waiverstrategy NOT NULL,
    simple_waiver_multiplier numeric(5,2),
    has_caa_override boolean NOT NULL,
    caa_override_amount numeric(10,2),
    caa_waiver_strategy_override public.waiverstrategy,
    caa_simple_waiver_multiplier_override numeric(5,2),
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    is_primary_fee boolean DEFAULT false NOT NULL
);


ALTER TABLE public.fee_rules OWNER TO fbo_user;

--
-- Name: fee_rules_id_seq; Type: SEQUENCE; Schema: public; Owner: fbo_user
--

CREATE SEQUENCE public.fee_rules_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.fee_rules_id_seq OWNER TO fbo_user;

--
-- Name: fee_rules_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: fbo_user
--

ALTER SEQUENCE public.fee_rules_id_seq OWNED BY public.fee_rules.id;


--
-- Name: fuel_orders; Type: TABLE; Schema: public; Owner: fbo_user
--

CREATE TABLE public.fuel_orders (
    id integer NOT NULL,
    status public.fuelorderstatus NOT NULL,
    tail_number character varying(20) NOT NULL,
    customer_id integer,
    fuel_type character varying(50) NOT NULL,
    additive_requested boolean,
    requested_amount numeric(10,2),
    assigned_lst_user_id integer,
    assigned_truck_id integer,
    location_on_ramp character varying(100),
    csr_notes text,
    lst_notes text,
    start_meter_reading numeric(12,2),
    end_meter_reading numeric(12,2),
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    dispatch_timestamp timestamp without time zone,
    acknowledge_timestamp timestamp without time zone,
    en_route_timestamp timestamp without time zone,
    fueling_start_timestamp timestamp without time zone,
    completion_timestamp timestamp without time zone,
    reviewed_timestamp timestamp without time zone,
    reviewed_by_csr_user_id integer,
    change_version integer DEFAULT 0 NOT NULL,
    gallons_dispensed numeric(10,2),
    acknowledged_change_version integer DEFAULT 0 NOT NULL,
    priority public.fuelorderpriority DEFAULT 'normal'::public.fuelorderpriority NOT NULL,
    review_notes text,
    estimated_completion_time timestamp without time zone
);


ALTER TABLE public.fuel_orders OWNER TO fbo_user;

--
-- Name: fuel_orders_id_seq; Type: SEQUENCE; Schema: public; Owner: fbo_user
--

CREATE SEQUENCE public.fuel_orders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.fuel_orders_id_seq OWNER TO fbo_user;

--
-- Name: fuel_orders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: fbo_user
--

ALTER SEQUENCE public.fuel_orders_id_seq OWNED BY public.fuel_orders.id;


--
-- Name: fuel_prices; Type: TABLE; Schema: public; Owner: fbo_user
--

CREATE TABLE public.fuel_prices (
    id integer NOT NULL,
    fbo_location_id integer NOT NULL,
    fuel_type public.fueltypeenum NOT NULL,
    price numeric(10,4) NOT NULL,
    currency character varying(3) NOT NULL,
    effective_date timestamp without time zone NOT NULL,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


ALTER TABLE public.fuel_prices OWNER TO fbo_user;

--
-- Name: fuel_prices_id_seq; Type: SEQUENCE; Schema: public; Owner: fbo_user
--

CREATE SEQUENCE public.fuel_prices_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.fuel_prices_id_seq OWNER TO fbo_user;

--
-- Name: fuel_prices_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: fbo_user
--

ALTER SEQUENCE public.fuel_prices_id_seq OWNED BY public.fuel_prices.id;


--
-- Name: fuel_trucks; Type: TABLE; Schema: public; Owner: fbo_user
--

CREATE TABLE public.fuel_trucks (
    id integer NOT NULL,
    truck_number character varying(20) NOT NULL,
    fuel_type character varying(50) NOT NULL,
    capacity numeric(10,2) NOT NULL,
    current_meter_reading numeric(12,2) NOT NULL,
    is_active boolean NOT NULL,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


ALTER TABLE public.fuel_trucks OWNER TO fbo_user;

--
-- Name: fuel_trucks_id_seq; Type: SEQUENCE; Schema: public; Owner: fbo_user
--

CREATE SEQUENCE public.fuel_trucks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.fuel_trucks_id_seq OWNER TO fbo_user;

--
-- Name: fuel_trucks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: fbo_user
--

ALTER SEQUENCE public.fuel_trucks_id_seq OWNED BY public.fuel_trucks.id;


--
-- Name: permission_group_memberships; Type: TABLE; Schema: public; Owner: fbo_user
--

CREATE TABLE public.permission_group_memberships (
    id integer NOT NULL,
    group_id integer NOT NULL,
    permission_id integer NOT NULL,
    is_active boolean NOT NULL,
    granted_at timestamp without time zone NOT NULL,
    granted_by_id integer
);


ALTER TABLE public.permission_group_memberships OWNER TO fbo_user;

--
-- Name: permission_group_memberships_id_seq; Type: SEQUENCE; Schema: public; Owner: fbo_user
--

CREATE SEQUENCE public.permission_group_memberships_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.permission_group_memberships_id_seq OWNER TO fbo_user;

--
-- Name: permission_group_memberships_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: fbo_user
--

ALTER SEQUENCE public.permission_group_memberships_id_seq OWNED BY public.permission_group_memberships.id;


--
-- Name: permission_groups; Type: TABLE; Schema: public; Owner: fbo_user
--

CREATE TABLE public.permission_groups (
    id integer NOT NULL,
    name character varying(50) NOT NULL,
    description text,
    is_active boolean DEFAULT true NOT NULL,
    is_system_group boolean DEFAULT false NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    display_name character varying(100) NOT NULL,
    parent_id integer
);


ALTER TABLE public.permission_groups OWNER TO fbo_user;

--
-- Name: permission_groups_id_seq; Type: SEQUENCE; Schema: public; Owner: fbo_user
--

CREATE SEQUENCE public.permission_groups_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.permission_groups_id_seq OWNER TO fbo_user;

--
-- Name: permission_groups_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: fbo_user
--

ALTER SEQUENCE public.permission_groups_id_seq OWNED BY public.permission_groups.id;


--
-- Name: permissions; Type: TABLE; Schema: public; Owner: fbo_user
--

CREATE TABLE public.permissions (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    resource_type character varying(50),
    scope character varying(20) DEFAULT 'any'::character varying NOT NULL
);


ALTER TABLE public.permissions OWNER TO fbo_user;

--
-- Name: permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: fbo_user
--

CREATE SEQUENCE public.permissions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.permissions_id_seq OWNER TO fbo_user;

--
-- Name: permissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: fbo_user
--

ALTER SEQUENCE public.permissions_id_seq OWNED BY public.permissions.id;


--
-- Name: receipt_line_items; Type: TABLE; Schema: public; Owner: fbo_user
--

CREATE TABLE public.receipt_line_items (
    id integer NOT NULL,
    receipt_id integer NOT NULL,
    line_item_type public.lineitemtype NOT NULL,
    description character varying(200) NOT NULL,
    fee_code_applied character varying(50),
    quantity numeric(10,2) NOT NULL,
    unit_price numeric(10,4) NOT NULL,
    amount numeric(10,2) NOT NULL,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


ALTER TABLE public.receipt_line_items OWNER TO fbo_user;

--
-- Name: receipt_line_items_id_seq; Type: SEQUENCE; Schema: public; Owner: fbo_user
--

CREATE SEQUENCE public.receipt_line_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.receipt_line_items_id_seq OWNER TO fbo_user;

--
-- Name: receipt_line_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: fbo_user
--

ALTER SEQUENCE public.receipt_line_items_id_seq OWNED BY public.receipt_line_items.id;


--
-- Name: receipts; Type: TABLE; Schema: public; Owner: fbo_user
--

CREATE TABLE public.receipts (
    id integer NOT NULL,
    receipt_number character varying(50),
    fbo_location_id integer NOT NULL,
    fuel_order_id integer,
    customer_id integer NOT NULL,
    aircraft_type_at_receipt_time character varying(100),
    fuel_type_at_receipt_time character varying(50),
    fuel_quantity_gallons_at_receipt_time numeric(10,2),
    fuel_unit_price_at_receipt_time numeric(10,4),
    fuel_subtotal numeric(10,2) NOT NULL,
    total_fees_amount numeric(10,2) NOT NULL,
    total_waivers_amount numeric(10,2) NOT NULL,
    tax_amount numeric(10,2) NOT NULL,
    grand_total_amount numeric(10,2) NOT NULL,
    status public.receiptstatus NOT NULL,
    is_caa_applied boolean NOT NULL,
    generated_at timestamp without time zone,
    paid_at timestamp without time zone,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    created_by_user_id integer NOT NULL,
    updated_by_user_id integer NOT NULL
);


ALTER TABLE public.receipts OWNER TO fbo_user;

--
-- Name: receipts_id_seq; Type: SEQUENCE; Schema: public; Owner: fbo_user
--

CREATE SEQUENCE public.receipts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.receipts_id_seq OWNER TO fbo_user;

--
-- Name: receipts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: fbo_user
--

ALTER SEQUENCE public.receipts_id_seq OWNED BY public.receipts.id;


--
-- Name: role_permission_groups; Type: TABLE; Schema: public; Owner: fbo_user
--

CREATE TABLE public.role_permission_groups (
    id integer NOT NULL,
    role_id integer NOT NULL,
    group_id integer NOT NULL,
    is_active boolean NOT NULL,
    assigned_at timestamp without time zone NOT NULL,
    assigned_by_id integer
);


ALTER TABLE public.role_permission_groups OWNER TO fbo_user;

--
-- Name: role_permission_groups_id_seq; Type: SEQUENCE; Schema: public; Owner: fbo_user
--

CREATE SEQUENCE public.role_permission_groups_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.role_permission_groups_id_seq OWNER TO fbo_user;

--
-- Name: role_permission_groups_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: fbo_user
--

ALTER SEQUENCE public.role_permission_groups_id_seq OWNED BY public.role_permission_groups.id;


--
-- Name: role_permissions; Type: TABLE; Schema: public; Owner: fbo_user
--

CREATE TABLE public.role_permissions (
    role_id integer NOT NULL,
    permission_id integer NOT NULL
);


ALTER TABLE public.role_permissions OWNER TO fbo_user;

--
-- Name: roles; Type: TABLE; Schema: public; Owner: fbo_user
--

CREATE TABLE public.roles (
    id integer NOT NULL,
    name character varying(80) NOT NULL,
    description text,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


ALTER TABLE public.roles OWNER TO fbo_user;

--
-- Name: roles_id_seq; Type: SEQUENCE; Schema: public; Owner: fbo_user
--

CREATE SEQUENCE public.roles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.roles_id_seq OWNER TO fbo_user;

--
-- Name: roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: fbo_user
--

ALTER SEQUENCE public.roles_id_seq OWNED BY public.roles.id;


--
-- Name: user_permission_group_assignments; Type: TABLE; Schema: public; Owner: fbo_user
--

CREATE TABLE public.user_permission_group_assignments (
    id integer NOT NULL,
    user_id integer NOT NULL,
    permission_group_id integer NOT NULL,
    assigned_at timestamp without time zone NOT NULL,
    assigned_by_user_id integer,
    assigned_by_migration boolean DEFAULT false NOT NULL,
    assignment_reason character varying(255),
    is_active boolean DEFAULT true NOT NULL,
    expires_at timestamp without time zone,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


ALTER TABLE public.user_permission_group_assignments OWNER TO fbo_user;

--
-- Name: user_permission_group_assignments_id_seq; Type: SEQUENCE; Schema: public; Owner: fbo_user
--

CREATE SEQUENCE public.user_permission_group_assignments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.user_permission_group_assignments_id_seq OWNER TO fbo_user;

--
-- Name: user_permission_group_assignments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: fbo_user
--

ALTER SEQUENCE public.user_permission_group_assignments_id_seq OWNED BY public.user_permission_group_assignments.id;


--
-- Name: user_permission_groups; Type: TABLE; Schema: public; Owner: fbo_user
--

CREATE TABLE public.user_permission_groups (
    user_id integer NOT NULL,
    permission_group_id integer NOT NULL
);


ALTER TABLE public.user_permission_groups OWNER TO fbo_user;

--
-- Name: user_permissions; Type: TABLE; Schema: public; Owner: fbo_user
--

CREATE TABLE public.user_permissions (
    id integer NOT NULL,
    user_id integer NOT NULL,
    permission_id integer NOT NULL,
    granted_by_user_id integer,
    granted_at timestamp without time zone NOT NULL,
    resource_type character varying(50),
    resource_id character varying(100),
    is_active boolean DEFAULT true NOT NULL,
    expires_at timestamp without time zone,
    reason text,
    revoked_at timestamp without time zone,
    revoked_by_user_id integer,
    revoked_reason text,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


ALTER TABLE public.user_permissions OWNER TO fbo_user;

--
-- Name: user_permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: fbo_user
--

CREATE SEQUENCE public.user_permissions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.user_permissions_id_seq OWNER TO fbo_user;

--
-- Name: user_permissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: fbo_user
--

ALTER SEQUENCE public.user_permissions_id_seq OWNED BY public.user_permissions.id;


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: fbo_user
--

CREATE TABLE public.user_roles (
    user_id integer NOT NULL,
    role_id integer NOT NULL
);


ALTER TABLE public.user_roles OWNER TO fbo_user;

--
-- Name: users; Type: TABLE; Schema: public; Owner: fbo_user
--

CREATE TABLE public.users (
    id integer NOT NULL,
    username character varying(64) NOT NULL,
    email character varying(120) NOT NULL,
    name character varying(120),
    password_hash character varying(128),
    is_active boolean NOT NULL,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    employee_id character varying(20),
    status character varying(20),
    shift character varying(20),
    certifications json,
    performance_rating double precision,
    orders_completed integer,
    average_time double precision,
    last_active timestamp without time zone,
    hire_date timestamp without time zone,
    fbo_location_id integer
);


ALTER TABLE public.users OWNER TO fbo_user;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: fbo_user
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.users_id_seq OWNER TO fbo_user;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: fbo_user
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: waiver_tiers; Type: TABLE; Schema: public; Owner: fbo_user
--

CREATE TABLE public.waiver_tiers (
    id integer NOT NULL,
    fbo_location_id integer NOT NULL,
    name character varying(100) NOT NULL,
    fuel_uplift_multiplier numeric(5,2) NOT NULL,
    fees_waived_codes json NOT NULL,
    tier_priority integer NOT NULL,
    is_caa_specific_tier boolean NOT NULL,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


ALTER TABLE public.waiver_tiers OWNER TO fbo_user;

--
-- Name: waiver_tiers_id_seq; Type: SEQUENCE; Schema: public; Owner: fbo_user
--

CREATE SEQUENCE public.waiver_tiers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.waiver_tiers_id_seq OWNER TO fbo_user;

--
-- Name: waiver_tiers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: fbo_user
--

ALTER SEQUENCE public.waiver_tiers_id_seq OWNED BY public.waiver_tiers.id;


--
-- Name: aircraft_type_fee_category_mappings id; Type: DEFAULT; Schema: public; Owner: fbo_user
--

ALTER TABLE ONLY public.aircraft_type_fee_category_mappings ALTER COLUMN id SET DEFAULT nextval('public.aircraft_type_fee_category_mappings_id_seq'::regclass);


--
-- Name: aircraft_types id; Type: DEFAULT; Schema: public; Owner: fbo_user
--

ALTER TABLE ONLY public.aircraft_types ALTER COLUMN id SET DEFAULT nextval('public.aircraft_types_id_seq'::regclass);


--
-- Name: audit_logs id; Type: DEFAULT; Schema: public; Owner: fbo_user
--

ALTER TABLE ONLY public.audit_logs ALTER COLUMN id SET DEFAULT nextval('public.audit_logs_id_seq'::regclass);


--
-- Name: customers id; Type: DEFAULT; Schema: public; Owner: fbo_user
--

ALTER TABLE ONLY public.customers ALTER COLUMN id SET DEFAULT nextval('public.customers_id_seq'::regclass);


--
-- Name: fbo_aircraft_type_configs id; Type: DEFAULT; Schema: public; Owner: fbo_user
--

ALTER TABLE ONLY public.fbo_aircraft_type_configs ALTER COLUMN id SET DEFAULT nextval('public.fbo_aircraft_type_configs_id_seq'::regclass);


--
-- Name: fee_categories id; Type: DEFAULT; Schema: public; Owner: fbo_user
--

ALTER TABLE ONLY public.fee_categories ALTER COLUMN id SET DEFAULT nextval('public.fee_categories_id_seq'::regclass);


--
-- Name: fee_rule_overrides id; Type: DEFAULT; Schema: public; Owner: fbo_user
--

ALTER TABLE ONLY public.fee_rule_overrides ALTER COLUMN id SET DEFAULT nextval('public.fee_rule_overrides_id_seq'::regclass);


--
-- Name: fee_rules id; Type: DEFAULT; Schema: public; Owner: fbo_user
--

ALTER TABLE ONLY public.fee_rules ALTER COLUMN id SET DEFAULT nextval('public.fee_rules_id_seq'::regclass);


--
-- Name: fuel_orders id; Type: DEFAULT; Schema: public; Owner: fbo_user
--

ALTER TABLE ONLY public.fuel_orders ALTER COLUMN id SET DEFAULT nextval('public.fuel_orders_id_seq'::regclass);


--
-- Name: fuel_prices id; Type: DEFAULT; Schema: public; Owner: fbo_user
--

ALTER TABLE ONLY public.fuel_prices ALTER COLUMN id SET DEFAULT nextval('public.fuel_prices_id_seq'::regclass);


--
-- Name: fuel_trucks id; Type: DEFAULT; Schema: public; Owner: fbo_user
--

ALTER TABLE ONLY public.fuel_trucks ALTER COLUMN id SET DEFAULT nextval('public.fuel_trucks_id_seq'::regclass);


--
-- Name: permission_group_memberships id; Type: DEFAULT; Schema: public; Owner: fbo_user
--

ALTER TABLE ONLY public.permission_group_memberships ALTER COLUMN id SET DEFAULT nextval('public.permission_group_memberships_id_seq'::regclass);


--
-- Name: permission_groups id; Type: DEFAULT; Schema: public; Owner: fbo_user
--

ALTER TABLE ONLY public.permission_groups ALTER COLUMN id SET DEFAULT nextval('public.permission_groups_id_seq'::regclass);


--
-- Name: permissions id; Type: DEFAULT; Schema: public; Owner: fbo_user
--

ALTER TABLE ONLY public.permissions ALTER COLUMN id SET DEFAULT nextval('public.permissions_id_seq'::regclass);


--
-- Name: receipt_line_items id; Type: DEFAULT; Schema: public; Owner: fbo_user
--

ALTER TABLE ONLY public.receipt_line_items ALTER COLUMN id SET DEFAULT nextval('public.receipt_line_items_id_seq'::regclass);


--
-- Name: receipts id; Type: DEFAULT; Schema: public; Owner: fbo_user
--

ALTER TABLE ONLY public.receipts ALTER COLUMN id SET DEFAULT nextval('public.receipts_id_seq'::regclass);


--
-- Name: role_permission_groups id; Type: DEFAULT; Schema: public; Owner: fbo_user
--

ALTER TABLE ONLY public.role_permission_groups ALTER COLUMN id SET DEFAULT nextval('public.role_permission_groups_id_seq'::regclass);


--
-- Name: roles id; Type: DEFAULT; Schema: public; Owner: fbo_user
--

ALTER TABLE ONLY public.roles ALTER COLUMN id SET DEFAULT nextval('public.roles_id_seq'::regclass);


--
-- Name: user_permission_group_assignments id; Type: DEFAULT; Schema: public; Owner: fbo_user
--

ALTER TABLE ONLY public.user_permission_group_assignments ALTER COLUMN id SET DEFAULT nextval('public.user_permission_group_assignments_id_seq'::regclass);


--
-- Name: user_permissions id; Type: DEFAULT; Schema: public; Owner: fbo_user
--

ALTER TABLE ONLY public.user_permissions ALTER COLUMN id SET DEFAULT nextval('public.user_permissions_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: fbo_user
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: waiver_tiers id; Type: DEFAULT; Schema: public; Owner: fbo_user
--

ALTER TABLE ONLY public.waiver_tiers ALTER COLUMN id SET DEFAULT nextval('public.waiver_tiers_id_seq'::regclass);


--
-- Data for Name: aircraft; Type: TABLE DATA; Schema: public; Owner: fbo_user
--

COPY public.aircraft (tail_number, aircraft_type, fuel_type, created_at, updated_at, customer_id) FROM stdin;
\.


--
-- Data for Name: aircraft_type_fee_category_mappings; Type: TABLE DATA; Schema: public; Owner: fbo_user
--

COPY public.aircraft_type_fee_category_mappings (id, fbo_location_id, aircraft_type_id, fee_category_id, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: aircraft_types; Type: TABLE DATA; Schema: public; Owner: fbo_user
--

COPY public.aircraft_types (id, name, base_min_fuel_gallons_for_waiver, default_fee_category_id, default_max_gross_weight_lbs, created_at, updated_at) FROM stdin;
1	Citation CJ3	100.00	\N	\N	2025-06-26 19:30:08.430621	2025-06-26 19:30:08.430622
2	Citation Mustang	80.00	\N	\N	2025-06-26 19:30:08.43203	2025-06-26 19:30:08.432031
3	Gulfstream G650	200.00	\N	\N	2025-06-26 19:30:08.433063	2025-06-26 19:30:08.433064
4	King Air 350	120.00	\N	\N	2025-06-26 19:30:08.434095	2025-06-26 19:30:08.434096
5	Pilatus PC-12	90.00	\N	\N	2025-06-26 19:30:08.435081	2025-06-26 19:30:08.435082
6	Cessna 172	30.00	\N	\N	2025-06-26 19:30:08.436042	2025-06-26 19:30:08.436043
7	Cessna 182	35.00	\N	\N	2025-06-26 19:30:08.436991	2025-06-26 19:30:08.436992
8	Piper Archer	32.00	\N	\N	2025-06-26 19:30:08.437986	2025-06-26 19:30:08.437987
9	Beechcraft Bonanza	40.00	\N	\N	2025-06-26 19:30:08.438919	2025-06-26 19:30:08.43892
\.


--
-- Data for Name: alembic_version; Type: TABLE DATA; Schema: public; Owner: fbo_user
--

COPY public.alembic_version (version_num) FROM stdin;
a525066160e4
\.


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: fbo_user
--

COPY public.audit_logs (id, user_id, entity_type, entity_id, action, details, "timestamp") FROM stdin;
\.


--
-- Data for Name: customers; Type: TABLE DATA; Schema: public; Owner: fbo_user
--

COPY public.customers (id, name, email, phone, created_at, updated_at, is_placeholder, is_caa_member, caa_member_id) FROM stdin;
\.


--
-- Data for Name: fbo_aircraft_type_configs; Type: TABLE DATA; Schema: public; Owner: fbo_user
--

COPY public.fbo_aircraft_type_configs (id, fbo_location_id, aircraft_type_id, base_min_fuel_gallons_for_waiver, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: fee_categories; Type: TABLE DATA; Schema: public; Owner: fbo_user
--

COPY public.fee_categories (id, fbo_location_id, name, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: fee_rule_overrides; Type: TABLE DATA; Schema: public; Owner: fbo_user
--

COPY public.fee_rule_overrides (id, fbo_location_id, aircraft_type_id, fee_rule_id, override_amount, override_caa_amount, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: fee_rules; Type: TABLE DATA; Schema: public; Owner: fbo_user
--

COPY public.fee_rules (id, fbo_location_id, fee_name, fee_code, applies_to_fee_category_id, amount, currency, is_taxable, is_potentially_waivable_by_fuel_uplift, calculation_basis, waiver_strategy, simple_waiver_multiplier, has_caa_override, caa_override_amount, caa_waiver_strategy_override, caa_simple_waiver_multiplier_override, created_at, updated_at, is_primary_fee) FROM stdin;
\.


--
-- Data for Name: fuel_orders; Type: TABLE DATA; Schema: public; Owner: fbo_user
--

COPY public.fuel_orders (id, status, tail_number, customer_id, fuel_type, additive_requested, requested_amount, assigned_lst_user_id, assigned_truck_id, location_on_ramp, csr_notes, lst_notes, start_meter_reading, end_meter_reading, created_at, updated_at, dispatch_timestamp, acknowledge_timestamp, en_route_timestamp, fueling_start_timestamp, completion_timestamp, reviewed_timestamp, reviewed_by_csr_user_id, change_version, gallons_dispensed, acknowledged_change_version, priority, review_notes, estimated_completion_time) FROM stdin;
\.


--
-- Data for Name: fuel_prices; Type: TABLE DATA; Schema: public; Owner: fbo_user
--

COPY public.fuel_prices (id, fbo_location_id, fuel_type, price, currency, effective_date, created_at, updated_at) FROM stdin;
1	1	JET_A	6.2500	USD	2025-06-26 19:41:13.891847	2025-06-26 19:41:13.893126	2025-06-26 19:41:13.893128
2	1	AVGAS_100LL	7.1500	USD	2025-06-26 19:41:13.891887	2025-06-26 19:41:13.893128	2025-06-26 19:41:13.893128
3	1	SAF_JET_A	8.5000	USD	2025-06-26 19:41:13.891897	2025-06-26 19:41:13.893129	2025-06-26 19:41:13.893129
\.


--
-- Data for Name: fuel_trucks; Type: TABLE DATA; Schema: public; Owner: fbo_user
--

COPY public.fuel_trucks (id, truck_number, fuel_type, capacity, current_meter_reading, is_active, created_at, updated_at) FROM stdin;
3	FT-001	Jet A	5000.00	12345.67	t	2025-06-26 19:30:19.265198	2025-06-26 19:30:19.265204
4	FT-002	Jet A	5000.00	0.00	f	2025-06-26 19:30:19.26862	2025-06-26 19:30:19.268623
\.


--
-- Data for Name: permission_group_memberships; Type: TABLE DATA; Schema: public; Owner: fbo_user
--

COPY public.permission_group_memberships (id, group_id, permission_id, is_active, granted_at, granted_by_id) FROM stdin;
\.


--
-- Data for Name: permission_groups; Type: TABLE DATA; Schema: public; Owner: fbo_user
--

COPY public.permission_groups (id, name, description, is_active, is_system_group, sort_order, created_at, updated_at, display_name, parent_id) FROM stdin;
\.


--
-- Data for Name: permissions; Type: TABLE DATA; Schema: public; Owner: fbo_user
--

COPY public.permissions (id, name, description, created_at, updated_at, is_active, resource_type, scope) FROM stdin;
58	create_fuel_order	Allows creating new fuel orders	2025-06-26 19:30:18.087474	2025-06-26 19:30:18.087476	t	\N	any
59	view_assigned_orders	Allows viewing orders assigned to self	2025-06-26 19:30:18.087477	2025-06-26 19:30:18.087477	t	\N	any
60	view_all_orders	Allows viewing all fuel orders	2025-06-26 19:30:18.087477	2025-06-26 19:30:18.087478	t	\N	any
61	update_order_status	Allows LST to update status of own orders	2025-06-26 19:30:18.087478	2025-06-26 19:30:18.087478	t	\N	any
62	complete_fuel_order	Allows LST to complete own orders	2025-06-26 19:30:18.087479	2025-06-26 19:30:18.087479	t	\N	any
63	review_fuel_order	Allows CSR/Admin to mark orders as reviewed	2025-06-26 19:30:18.087479	2025-06-26 19:30:18.087479	t	\N	any
64	export_orders_csv	Allows exporting order data to CSV	2025-06-26 19:30:18.08748	2025-06-26 19:30:18.08748	t	\N	any
65	view_order_statistics	Allows viewing order statistics	2025-06-26 19:30:18.08748	2025-06-26 19:30:18.087481	t	\N	any
66	edit_fuel_order	Allows editing fuel order details	2025-06-26 19:30:18.087481	2025-06-26 19:30:18.087481	t	\N	any
67	assign_fuel_order	Allows assigning fuel orders to LST staff	2025-06-26 19:30:18.087482	2025-06-26 19:30:18.087482	t	\N	any
68	delete_fuel_order	Allows deleting fuel orders	2025-06-26 19:30:18.087482	2025-06-26 19:30:18.087483	t	\N	any
69	perform_fueling_task	Allows performing fueling operations and task management	2025-06-26 19:30:18.087483	2025-06-26 19:30:18.087483	t	\N	any
70	view_users	Allows viewing user list	2025-06-26 19:30:18.087484	2025-06-26 19:30:18.087484	t	\N	any
71	manage_users	Allows creating, updating, deleting users and assigning roles	2025-06-26 19:30:18.087484	2025-06-26 19:30:18.087485	t	\N	any
72	view_fuel_trucks	Allows viewing fuel truck list	2025-06-26 19:30:18.087485	2025-06-26 19:30:18.087485	t	\N	any
73	manage_fuel_trucks	Allows creating, updating, deleting fuel trucks	2025-06-26 19:30:18.087486	2025-06-26 19:30:18.087486	t	\N	any
74	view_aircraft	Allows viewing aircraft list	2025-06-26 19:30:18.087486	2025-06-26 19:30:18.087486	t	\N	any
75	manage_aircraft	Allows creating, updating, deleting aircraft	2025-06-26 19:30:18.087487	2025-06-26 19:30:18.087487	t	\N	any
76	view_customers	Allows viewing customer list	2025-06-26 19:30:18.087487	2025-06-26 19:30:18.087488	t	\N	any
77	manage_customers	Allows creating, updating, deleting customers	2025-06-26 19:30:18.087488	2025-06-26 19:30:18.087488	t	\N	any
78	manage_roles	Allows managing roles and their permissions	2025-06-26 19:30:18.087489	2025-06-26 19:30:18.087489	t	\N	any
79	view_permissions	Allows viewing available system permissions	2025-06-26 19:30:18.087489	2025-06-26 19:30:18.087489	t	\N	any
80	view_role_permissions	Allows viewing permissions assigned to roles	2025-06-26 19:30:18.08749	2025-06-26 19:30:18.08749	t	\N	any
81	view_roles	Allows viewing all system roles	2025-06-26 19:30:18.08749	2025-06-26 19:30:18.087491	t	\N	any
82	manage_settings	Allows managing global application settings	2025-06-26 19:30:18.087491	2025-06-26 19:30:18.087491	t	\N	any
83	admin	General administrative access for specific system functions	2025-06-26 19:30:18.087492	2025-06-26 19:30:18.087492	t	\N	any
84	administrative_operations	Allows performing administrative operations and system configuration	2025-06-26 19:30:18.087492	2025-06-26 19:30:18.087493	t	\N	any
85	access_admin_dashboard	Allows access to admin dashboard	2025-06-26 19:30:18.087493	2025-06-26 19:30:18.087493	t	\N	any
86	access_csr_dashboard	Allows access to CSR dashboard	2025-06-26 19:30:18.087494	2025-06-26 19:30:18.087494	t	\N	any
87	access_fueler_dashboard	Allows access to fueler dashboard	2025-06-26 19:30:18.087494	2025-06-26 19:30:18.087494	t	\N	any
88	access_member_dashboard	Allows access to member dashboard	2025-06-26 19:30:18.087495	2025-06-26 19:30:18.087495	t	\N	any
89	view_billing_info	Allows viewing billing information and fee calculations	2025-06-26 19:30:18.087495	2025-06-26 19:30:18.087496	t	\N	any
90	calculate_fees	Allows calculating fees and charges	2025-06-26 19:30:18.087496	2025-06-26 19:30:18.087496	t	\N	any
91	manage_fbo_fee_schedules	Allows managing FBO fee schedules, categories, rules, and waiver tiers	2025-06-26 19:30:18.087497	2025-06-26 19:30:18.087497	t	\N	any
92	manage_fuel_prices	Allows managing fuel prices for an FBO location	2025-06-26 19:30:18.087497	2025-06-26 19:30:18.087497	t	\N	any
93	view_receipts	Allows viewing fuel receipts	2025-06-26 19:30:18.087498	2025-06-26 19:30:18.087498	t	\N	any
94	view_all_receipts	Allows viewing all fuel receipts	2025-06-26 19:30:18.087498	2025-06-26 19:30:18.087499	t	\N	any
95	view_own_receipts	Allows viewing own fuel receipts	2025-06-26 19:30:18.087499	2025-06-26 19:30:18.087499	t	\N	any
96	create_receipt	Allows creating new fuel receipts from completed orders	2025-06-26 19:30:18.0875	2025-06-26 19:30:18.0875	t	\N	any
97	update_receipt	Allows updating draft fuel receipts	2025-06-26 19:30:18.0875	2025-06-26 19:30:18.0875	t	\N	any
98	calculate_receipt_fees	Allows calculating fees for fuel receipts	2025-06-26 19:30:18.087501	2025-06-26 19:30:18.087501	t	\N	any
99	generate_receipt	Allows generating final fuel receipts	2025-06-26 19:30:18.087501	2025-06-26 19:30:18.087502	t	\N	any
100	mark_receipt_paid	Allows marking fuel receipts as paid	2025-06-26 19:30:18.087502	2025-06-26 19:30:18.087502	t	\N	any
101	void_receipt	Allows voiding generated or paid fuel receipts	2025-06-26 19:30:18.087503	2025-06-26 19:30:18.087503	t	\N	any
102	manage_receipts	Allows creating, editing, and managing fuel receipts	2025-06-26 19:30:18.087503	2025-06-26 19:30:18.087504	t	\N	any
103	export_receipts_csv	Allows exporting receipt data to CSV	2025-06-26 19:30:18.087504	2025-06-26 19:30:18.087504	t	\N	any
\.


--
-- Data for Name: receipt_line_items; Type: TABLE DATA; Schema: public; Owner: fbo_user
--

COPY public.receipt_line_items (id, receipt_id, line_item_type, description, fee_code_applied, quantity, unit_price, amount, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: receipts; Type: TABLE DATA; Schema: public; Owner: fbo_user
--

COPY public.receipts (id, receipt_number, fbo_location_id, fuel_order_id, customer_id, aircraft_type_at_receipt_time, fuel_type_at_receipt_time, fuel_quantity_gallons_at_receipt_time, fuel_unit_price_at_receipt_time, fuel_subtotal, total_fees_amount, total_waivers_amount, tax_amount, grand_total_amount, status, is_caa_applied, generated_at, paid_at, created_at, updated_at, created_by_user_id, updated_by_user_id) FROM stdin;
\.


--
-- Data for Name: role_permission_groups; Type: TABLE DATA; Schema: public; Owner: fbo_user
--

COPY public.role_permission_groups (id, role_id, group_id, is_active, assigned_at, assigned_by_id) FROM stdin;
\.


--
-- Data for Name: role_permissions; Type: TABLE DATA; Schema: public; Owner: fbo_user
--

COPY public.role_permissions (role_id, permission_id) FROM stdin;
\.


--
-- Data for Name: roles; Type: TABLE DATA; Schema: public; Owner: fbo_user
--

COPY public.roles (id, name, description, created_at, updated_at) FROM stdin;
5	System Administrator	Full system access	2025-06-26 19:30:18.09207	2025-06-26 19:30:18.092072
6	Customer Service Representative	Handles customer orders and assignments	2025-06-26 19:30:18.092072	2025-06-26 19:30:18.092072
7	Line Service Technician	Executes fuel orders and updates status	2025-06-26 19:30:18.092073	2025-06-26 19:30:18.092073
8	Member	Basic member with limited view access	2025-06-26 19:30:18.092073	2025-06-26 19:30:18.092073
\.


--
-- Data for Name: user_permission_group_assignments; Type: TABLE DATA; Schema: public; Owner: fbo_user
--

COPY public.user_permission_group_assignments (id, user_id, permission_group_id, assigned_at, assigned_by_user_id, assigned_by_migration, assignment_reason, is_active, expires_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: user_permission_groups; Type: TABLE DATA; Schema: public; Owner: fbo_user
--

COPY public.user_permission_groups (user_id, permission_group_id) FROM stdin;
\.


--
-- Data for Name: user_permissions; Type: TABLE DATA; Schema: public; Owner: fbo_user
--

COPY public.user_permissions (id, user_id, permission_id, granted_by_user_id, granted_at, resource_type, resource_id, is_active, expires_at, reason, revoked_at, revoked_by_user_id, revoked_reason, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: user_roles; Type: TABLE DATA; Schema: public; Owner: fbo_user
--

COPY public.user_roles (user_id, role_id) FROM stdin;
5	5
6	6
7	7
8	8
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: fbo_user
--

COPY public.users (id, username, email, name, password_hash, is_active, created_at, updated_at, employee_id, status, shift, certifications, performance_rating, orders_completed, average_time, last_active, hire_date, fbo_location_id) FROM stdin;
5	admin	admin@fbolaunchpad.com	Admin User	pbkdf2:sha256:1000000$2rG7RgaJHKrKZoYQ$3f07f7f4559616886880af86b99de81e4462b8a8eada2d0a316f1da4bcb53f38	t	2025-06-26 19:30:18.375998	2025-06-26 19:30:18.376001	\N	active	\N	\N	\N	0	\N	\N	\N	1
6	csr	csr@fbolaunchpad.com	CSR User	pbkdf2:sha256:1000000$zwCozCOuGE1b1mdl$1a2d5c957b6ed7f3c1198bcffe73fa07ca79c3e1fdbefb46bffcc82c08226b2d	t	2025-06-26 19:30:18.670714	2025-06-26 19:30:18.670717	\N	active	\N	\N	\N	0	\N	\N	\N	1
7	fueler	fueler@fbolaunchpad.com	Fueler User	pbkdf2:sha256:1000000$PXEisvdHpa5QX4R3$6b9f178e18c40d4c16dfd812e265d1aa76233bdbada8acbab05613a11a183e12	t	2025-06-26 19:30:18.945028	2025-06-26 19:30:18.945031	\N	active	\N	\N	\N	0	\N	\N	\N	1
8	member	member@fbolaunchpad.com	Member User	pbkdf2:sha256:1000000$VrI8KaAglUgIQulp$9ef33450d278b2cded95929b266c7c66527eedf1b1832278e3bbf51ba9801f76	t	2025-06-26 19:30:19.256171	2025-06-26 19:30:19.256174	\N	active	\N	\N	\N	0	\N	\N	\N	1
\.


--
-- Data for Name: waiver_tiers; Type: TABLE DATA; Schema: public; Owner: fbo_user
--

COPY public.waiver_tiers (id, fbo_location_id, name, fuel_uplift_multiplier, fees_waived_codes, tier_priority, is_caa_specific_tier, created_at, updated_at) FROM stdin;
\.


--
-- Name: aircraft_type_fee_category_mappings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: fbo_user
--

SELECT pg_catalog.setval('public.aircraft_type_fee_category_mappings_id_seq', 1, false);


--
-- Name: aircraft_types_id_seq; Type: SEQUENCE SET; Schema: public; Owner: fbo_user
--

SELECT pg_catalog.setval('public.aircraft_types_id_seq', 9, true);


--
-- Name: audit_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: fbo_user
--

SELECT pg_catalog.setval('public.audit_logs_id_seq', 1, false);


--
-- Name: customers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: fbo_user
--

SELECT pg_catalog.setval('public.customers_id_seq', 1, false);


--
-- Name: fbo_aircraft_type_configs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: fbo_user
--

SELECT pg_catalog.setval('public.fbo_aircraft_type_configs_id_seq', 1, false);


--
-- Name: fee_categories_id_seq; Type: SEQUENCE SET; Schema: public; Owner: fbo_user
--

SELECT pg_catalog.setval('public.fee_categories_id_seq', 1, false);


--
-- Name: fee_rule_overrides_id_seq; Type: SEQUENCE SET; Schema: public; Owner: fbo_user
--

SELECT pg_catalog.setval('public.fee_rule_overrides_id_seq', 1, false);


--
-- Name: fee_rules_id_seq; Type: SEQUENCE SET; Schema: public; Owner: fbo_user
--

SELECT pg_catalog.setval('public.fee_rules_id_seq', 1, false);


--
-- Name: fuel_orders_id_seq; Type: SEQUENCE SET; Schema: public; Owner: fbo_user
--

SELECT pg_catalog.setval('public.fuel_orders_id_seq', 1, false);


--
-- Name: fuel_prices_id_seq; Type: SEQUENCE SET; Schema: public; Owner: fbo_user
--

SELECT pg_catalog.setval('public.fuel_prices_id_seq', 3, true);


--
-- Name: fuel_trucks_id_seq; Type: SEQUENCE SET; Schema: public; Owner: fbo_user
--

SELECT pg_catalog.setval('public.fuel_trucks_id_seq', 4, true);


--
-- Name: permission_group_memberships_id_seq; Type: SEQUENCE SET; Schema: public; Owner: fbo_user
--

SELECT pg_catalog.setval('public.permission_group_memberships_id_seq', 45, true);


--
-- Name: permission_groups_id_seq; Type: SEQUENCE SET; Schema: public; Owner: fbo_user
--

SELECT pg_catalog.setval('public.permission_groups_id_seq', 18, true);


--
-- Name: permissions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: fbo_user
--

SELECT pg_catalog.setval('public.permissions_id_seq', 103, true);


--
-- Name: receipt_line_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: fbo_user
--

SELECT pg_catalog.setval('public.receipt_line_items_id_seq', 1, false);


--
-- Name: receipts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: fbo_user
--

SELECT pg_catalog.setval('public.receipts_id_seq', 1, false);


--
-- Name: role_permission_groups_id_seq; Type: SEQUENCE SET; Schema: public; Owner: fbo_user
--

SELECT pg_catalog.setval('public.role_permission_groups_id_seq', 23, true);


--
-- Name: roles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: fbo_user
--

SELECT pg_catalog.setval('public.roles_id_seq', 8, true);


--
-- Name: user_permission_group_assignments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: fbo_user
--

SELECT pg_catalog.setval('public.user_permission_group_assignments_id_seq', 1, false);


--
-- Name: user_permissions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: fbo_user
--

SELECT pg_catalog.setval('public.user_permissions_id_seq', 1, false);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: fbo_user
--

SELECT pg_catalog.setval('public.users_id_seq', 8, true);


--
-- Name: waiver_tiers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: fbo_user
--

SELECT pg_catalog.setval('public.waiver_tiers_id_seq', 1, false);


--
-- Name: fee_rule_overrides _fbo_aircraft_fee_rule_uc; Type: CONSTRAINT; Schema: public; Owner: fbo_user
--

ALTER TABLE ONLY public.fee_rule_overrides
    ADD CONSTRAINT _fbo_aircraft_fee_rule_uc UNIQUE (fbo_location_id, aircraft_type_id, fee_rule_id);


--
-- Name: aircraft aircraft_pkey; Type: CONSTRAINT; Schema: public; Owner: fbo_user
--

ALTER TABLE ONLY public.aircraft
    ADD CONSTRAINT aircraft_pkey PRIMARY KEY (tail_number);


--
-- Name: aircraft_type_fee_category_mappings aircraft_type_fee_category_mappings_pkey; Type: CONSTRAINT; Schema: public; Owner: fbo_user
--

ALTER TABLE ONLY public.aircraft_type_fee_category_mappings
    ADD CONSTRAINT aircraft_type_fee_category_mappings_pkey PRIMARY KEY (id);


--
-- Name: aircraft_types aircraft_types_pkey; Type: CONSTRAINT; Schema: public; Owner: fbo_user
--

ALTER TABLE ONLY public.aircraft_types
    ADD CONSTRAINT aircraft_types_pkey PRIMARY KEY (id);


--
-- Name: alembic_version alembic_version_pkc; Type: CONSTRAINT; Schema: public; Owner: fbo_user
--

ALTER TABLE ONLY public.alembic_version
    ADD CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: fbo_user
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: customers customers_caa_member_id_key; Type: CONSTRAINT; Schema: public; Owner: fbo_user
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_caa_member_id_key UNIQUE (caa_member_id);


--
-- Name: customers customers_pkey; Type: CONSTRAINT; Schema: public; Owner: fbo_user
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_pkey PRIMARY KEY (id);


--
-- Name: fbo_aircraft_type_configs fbo_aircraft_type_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: fbo_user
--

ALTER TABLE ONLY public.fbo_aircraft_type_configs
    ADD CONSTRAINT fbo_aircraft_type_configs_pkey PRIMARY KEY (id);


--
-- Name: fee_categories fee_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: fbo_user
--

ALTER TABLE ONLY public.fee_categories
    ADD CONSTRAINT fee_categories_pkey PRIMARY KEY (id);


--
-- Name: fee_rule_overrides fee_rule_overrides_pkey; Type: CONSTRAINT; Schema: public; Owner: fbo_user
--

ALTER TABLE ONLY public.fee_rule_overrides
    ADD CONSTRAINT fee_rule_overrides_pkey PRIMARY KEY (id);


--
-- Name: fee_rules fee_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: fbo_user
--

ALTER TABLE ONLY public.fee_rules
    ADD CONSTRAINT fee_rules_pkey PRIMARY KEY (id);


--
-- Name: fuel_orders fuel_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: fbo_user
--

ALTER TABLE ONLY public.fuel_orders
    ADD CONSTRAINT fuel_orders_pkey PRIMARY KEY (id);


--
-- Name: fuel_prices fuel_prices_pkey; Type: CONSTRAINT; Schema: public; Owner: fbo_user
--

ALTER TABLE ONLY public.fuel_prices
    ADD CONSTRAINT fuel_prices_pkey PRIMARY KEY (id);


--
-- Name: fuel_trucks fuel_trucks_pkey; Type: CONSTRAINT; Schema: public; Owner: fbo_user
--

ALTER TABLE ONLY public.fuel_trucks
    ADD CONSTRAINT fuel_trucks_pkey PRIMARY KEY (id);


--
-- Name: fuel_trucks fuel_trucks_truck_number_key; Type: CONSTRAINT; Schema: public; Owner: fbo_user
--

ALTER TABLE ONLY public.fuel_trucks
    ADD CONSTRAINT fuel_trucks_truck_number_key UNIQUE (truck_number);


--
-- Name: permission_group_memberships permission_group_memberships_pkey; Type: CONSTRAINT; Schema: public; Owner: fbo_user
--

ALTER TABLE ONLY public.permission_group_memberships
    ADD CONSTRAINT permission_group_memberships_pkey PRIMARY KEY (id);


--
-- Name: permission_groups permission_groups_pkey; Type: CONSTRAINT; Schema: public; Owner: fbo_user
--

ALTER TABLE ONLY public.permission_groups
    ADD CONSTRAINT permission_groups_pkey PRIMARY KEY (id);


--
-- Name: permissions permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: fbo_user
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_pkey PRIMARY KEY (id);


--
-- Name: receipt_line_items receipt_line_items_pkey; Type: CONSTRAINT; Schema: public; Owner: fbo_user
--

ALTER TABLE ONLY public.receipt_line_items
    ADD CONSTRAINT receipt_line_items_pkey PRIMARY KEY (id);


--
-- Name: receipts receipts_pkey; Type: CONSTRAINT; Schema: public; Owner: fbo_user
--

ALTER TABLE ONLY public.receipts
    ADD CONSTRAINT receipts_pkey PRIMARY KEY (id);


--
-- Name: role_permission_groups role_permission_groups_pkey; Type: CONSTRAINT; Schema: public; Owner: fbo_user
--

ALTER TABLE ONLY public.role_permission_groups
    ADD CONSTRAINT role_permission_groups_pkey PRIMARY KEY (id);


--
-- Name: role_permissions role_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: fbo_user
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_pkey PRIMARY KEY (role_id, permission_id);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: fbo_user
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: user_permission_group_assignments unique_user_permission_group; Type: CONSTRAINT; Schema: public; Owner: fbo_user
--

ALTER TABLE ONLY public.user_permission_group_assignments
    ADD CONSTRAINT unique_user_permission_group UNIQUE (user_id, permission_group_id);


--
-- Name: user_permissions unique_user_permission_resource; Type: CONSTRAINT; Schema: public; Owner: fbo_user
--

ALTER TABLE ONLY public.user_permissions
    ADD CONSTRAINT unique_user_permission_resource UNIQUE (user_id, permission_id, resource_type, resource_id);


--
-- Name: aircraft_type_fee_category_mappings uq_aircraft_type_fbo_mapping; Type: CONSTRAINT; Schema: public; Owner: fbo_user
--

ALTER TABLE ONLY public.aircraft_type_fee_category_mappings
    ADD CONSTRAINT uq_aircraft_type_fbo_mapping UNIQUE (fbo_location_id, aircraft_type_id);


--
-- Name: fbo_aircraft_type_configs uq_fbo_aircraft_config; Type: CONSTRAINT; Schema: public; Owner: fbo_user
--

ALTER TABLE ONLY public.fbo_aircraft_type_configs
    ADD CONSTRAINT uq_fbo_aircraft_config UNIQUE (fbo_location_id, aircraft_type_id);


--
-- Name: fee_categories uq_fee_category_fbo_name; Type: CONSTRAINT; Schema: public; Owner: fbo_user
--

ALTER TABLE ONLY public.fee_categories
    ADD CONSTRAINT uq_fee_category_fbo_name UNIQUE (fbo_location_id, name);


--
-- Name: fee_rules uq_fee_rule_fbo_code; Type: CONSTRAINT; Schema: public; Owner: fbo_user
--

ALTER TABLE ONLY public.fee_rules
    ADD CONSTRAINT uq_fee_rule_fbo_code UNIQUE (fbo_location_id, fee_code);


--
-- Name: fuel_prices uq_fuel_price_fbo_fuel_date; Type: CONSTRAINT; Schema: public; Owner: fbo_user
--

ALTER TABLE ONLY public.fuel_prices
    ADD CONSTRAINT uq_fuel_price_fbo_fuel_date UNIQUE (fbo_location_id, fuel_type, effective_date);


--
-- Name: permission_group_memberships uq_group_permission; Type: CONSTRAINT; Schema: public; Owner: fbo_user
--

ALTER TABLE ONLY public.permission_group_memberships
    ADD CONSTRAINT uq_group_permission UNIQUE (group_id, permission_id);


--
-- Name: receipts uq_receipt_fbo_number; Type: CONSTRAINT; Schema: public; Owner: fbo_user
--

ALTER TABLE ONLY public.receipts
    ADD CONSTRAINT uq_receipt_fbo_number UNIQUE (fbo_location_id, receipt_number);


--
-- Name: role_permission_groups uq_role_group; Type: CONSTRAINT; Schema: public; Owner: fbo_user
--

ALTER TABLE ONLY public.role_permission_groups
    ADD CONSTRAINT uq_role_group UNIQUE (role_id, group_id);


--
-- Name: user_permission_group_assignments user_permission_group_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: fbo_user
--

ALTER TABLE ONLY public.user_permission_group_assignments
    ADD CONSTRAINT user_permission_group_assignments_pkey PRIMARY KEY (id);


--
-- Name: user_permission_groups user_permission_groups_pkey; Type: CONSTRAINT; Schema: public; Owner: fbo_user
--

ALTER TABLE ONLY public.user_permission_groups
    ADD CONSTRAINT user_permission_groups_pkey PRIMARY KEY (user_id, permission_group_id);


--
-- Name: user_permissions user_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: fbo_user
--

ALTER TABLE ONLY public.user_permissions
    ADD CONSTRAINT user_permissions_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: fbo_user
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (user_id, role_id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: fbo_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: waiver_tiers waiver_tiers_pkey; Type: CONSTRAINT; Schema: public; Owner: fbo_user
--

ALTER TABLE ONLY public.waiver_tiers
    ADD CONSTRAINT waiver_tiers_pkey PRIMARY KEY (id);


--
-- Name: ix_aircraft_type_fee_category_mappings_fbo_location_id; Type: INDEX; Schema: public; Owner: fbo_user
--

CREATE INDEX ix_aircraft_type_fee_category_mappings_fbo_location_id ON public.aircraft_type_fee_category_mappings USING btree (fbo_location_id);


--
-- Name: ix_aircraft_types_name; Type: INDEX; Schema: public; Owner: fbo_user
--

CREATE UNIQUE INDEX ix_aircraft_types_name ON public.aircraft_types USING btree (name);


--
-- Name: ix_audit_logs_entity_id; Type: INDEX; Schema: public; Owner: fbo_user
--

CREATE INDEX ix_audit_logs_entity_id ON public.audit_logs USING btree (entity_id);


--
-- Name: ix_audit_logs_entity_type; Type: INDEX; Schema: public; Owner: fbo_user
--

CREATE INDEX ix_audit_logs_entity_type ON public.audit_logs USING btree (entity_type);


--
-- Name: ix_audit_logs_timestamp; Type: INDEX; Schema: public; Owner: fbo_user
--

CREATE INDEX ix_audit_logs_timestamp ON public.audit_logs USING btree ("timestamp");


--
-- Name: ix_audit_logs_user_id; Type: INDEX; Schema: public; Owner: fbo_user
--

CREATE INDEX ix_audit_logs_user_id ON public.audit_logs USING btree (user_id);


--
-- Name: ix_customers_email; Type: INDEX; Schema: public; Owner: fbo_user
--

CREATE UNIQUE INDEX ix_customers_email ON public.customers USING btree (email);


--
-- Name: ix_fbo_aircraft_type_configs_aircraft_type_id; Type: INDEX; Schema: public; Owner: fbo_user
--

CREATE INDEX ix_fbo_aircraft_type_configs_aircraft_type_id ON public.fbo_aircraft_type_configs USING btree (aircraft_type_id);


--
-- Name: ix_fbo_aircraft_type_configs_fbo_location_id; Type: INDEX; Schema: public; Owner: fbo_user
--

CREATE INDEX ix_fbo_aircraft_type_configs_fbo_location_id ON public.fbo_aircraft_type_configs USING btree (fbo_location_id);


--
-- Name: ix_fee_categories_fbo_location_id; Type: INDEX; Schema: public; Owner: fbo_user
--

CREATE INDEX ix_fee_categories_fbo_location_id ON public.fee_categories USING btree (fbo_location_id);


--
-- Name: ix_fee_rule_overrides_fbo_location_id; Type: INDEX; Schema: public; Owner: fbo_user
--

CREATE INDEX ix_fee_rule_overrides_fbo_location_id ON public.fee_rule_overrides USING btree (fbo_location_id);


--
-- Name: ix_fee_rules_fbo_location_id; Type: INDEX; Schema: public; Owner: fbo_user
--

CREATE INDEX ix_fee_rules_fbo_location_id ON public.fee_rules USING btree (fbo_location_id);


--
-- Name: ix_fee_rules_fee_code; Type: INDEX; Schema: public; Owner: fbo_user
--

CREATE INDEX ix_fee_rules_fee_code ON public.fee_rules USING btree (fee_code);


--
-- Name: ix_fuel_orders_assigned_lst_user_id; Type: INDEX; Schema: public; Owner: fbo_user
--

CREATE INDEX ix_fuel_orders_assigned_lst_user_id ON public.fuel_orders USING btree (assigned_lst_user_id);


--
-- Name: ix_fuel_orders_assigned_truck_id; Type: INDEX; Schema: public; Owner: fbo_user
--

CREATE INDEX ix_fuel_orders_assigned_truck_id ON public.fuel_orders USING btree (assigned_truck_id);


--
-- Name: ix_fuel_orders_status; Type: INDEX; Schema: public; Owner: fbo_user
--

CREATE INDEX ix_fuel_orders_status ON public.fuel_orders USING btree (status);


--
-- Name: ix_fuel_orders_tail_number; Type: INDEX; Schema: public; Owner: fbo_user
--

CREATE INDEX ix_fuel_orders_tail_number ON public.fuel_orders USING btree (tail_number);


--
-- Name: ix_fuel_prices_effective_date; Type: INDEX; Schema: public; Owner: fbo_user
--

CREATE INDEX ix_fuel_prices_effective_date ON public.fuel_prices USING btree (effective_date);


--
-- Name: ix_fuel_prices_fbo_location_id; Type: INDEX; Schema: public; Owner: fbo_user
--

CREATE INDEX ix_fuel_prices_fbo_location_id ON public.fuel_prices USING btree (fbo_location_id);


--
-- Name: ix_fuel_prices_fuel_type; Type: INDEX; Schema: public; Owner: fbo_user
--

CREATE INDEX ix_fuel_prices_fuel_type ON public.fuel_prices USING btree (fuel_type);


--
-- Name: ix_permission_groups_name; Type: INDEX; Schema: public; Owner: fbo_user
--

CREATE UNIQUE INDEX ix_permission_groups_name ON public.permission_groups USING btree (name);


--
-- Name: ix_permissions_name; Type: INDEX; Schema: public; Owner: fbo_user
--

CREATE UNIQUE INDEX ix_permissions_name ON public.permissions USING btree (name);


--
-- Name: ix_receipts_fbo_location_id; Type: INDEX; Schema: public; Owner: fbo_user
--

CREATE INDEX ix_receipts_fbo_location_id ON public.receipts USING btree (fbo_location_id);


--
-- Name: ix_receipts_fuel_order_id; Type: INDEX; Schema: public; Owner: fbo_user
--

CREATE INDEX ix_receipts_fuel_order_id ON public.receipts USING btree (fuel_order_id);


--
-- Name: ix_receipts_receipt_number; Type: INDEX; Schema: public; Owner: fbo_user
--

CREATE INDEX ix_receipts_receipt_number ON public.receipts USING btree (receipt_number);


--
-- Name: ix_roles_name; Type: INDEX; Schema: public; Owner: fbo_user
--

CREATE UNIQUE INDEX ix_roles_name ON public.roles USING btree (name);


--
-- Name: ix_user_permissions_permission_id; Type: INDEX; Schema: public; Owner: fbo_user
--

CREATE INDEX ix_user_permissions_permission_id ON public.user_permissions USING btree (permission_id);


--
-- Name: ix_user_permissions_user_id; Type: INDEX; Schema: public; Owner: fbo_user
--

CREATE INDEX ix_user_permissions_user_id ON public.user_permissions USING btree (user_id);


--
-- Name: ix_users_email; Type: INDEX; Schema: public; Owner: fbo_user
--

CREATE UNIQUE INDEX ix_users_email ON public.users USING btree (email);


--
-- Name: ix_users_employee_id; Type: INDEX; Schema: public; Owner: fbo_user
--

CREATE UNIQUE INDEX ix_users_employee_id ON public.users USING btree (employee_id);


--
-- Name: ix_users_fbo_location_id; Type: INDEX; Schema: public; Owner: fbo_user
--

CREATE INDEX ix_users_fbo_location_id ON public.users USING btree (fbo_location_id);


--
-- Name: ix_users_status; Type: INDEX; Schema: public; Owner: fbo_user
--

CREATE INDEX ix_users_status ON public.users USING btree (status);


--
-- Name: ix_users_username; Type: INDEX; Schema: public; Owner: fbo_user
--

CREATE UNIQUE INDEX ix_users_username ON public.users USING btree (username);


--
-- Name: ix_waiver_tiers_fbo_location_id; Type: INDEX; Schema: public; Owner: fbo_user
--

CREATE INDEX ix_waiver_tiers_fbo_location_id ON public.waiver_tiers USING btree (fbo_location_id);


--
-- Name: aircraft aircraft_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: fbo_user
--

ALTER TABLE ONLY public.aircraft
    ADD CONSTRAINT aircraft_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id);


--
-- Name: aircraft_type_fee_category_mappings aircraft_type_fee_category_mappings_aircraft_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: fbo_user
--

ALTER TABLE ONLY public.aircraft_type_fee_category_mappings
    ADD CONSTRAINT aircraft_type_fee_category_mappings_aircraft_type_id_fkey FOREIGN KEY (aircraft_type_id) REFERENCES public.aircraft_types(id);


--
-- Name: aircraft_type_fee_category_mappings aircraft_type_fee_category_mappings_fee_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: fbo_user
--

ALTER TABLE ONLY public.aircraft_type_fee_category_mappings
    ADD CONSTRAINT aircraft_type_fee_category_mappings_fee_category_id_fkey FOREIGN KEY (fee_category_id) REFERENCES public.fee_categories(id);


--
-- Name: audit_logs audit_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: fbo_user
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: fbo_aircraft_type_configs fbo_aircraft_type_configs_aircraft_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: fbo_user
--

ALTER TABLE ONLY public.fbo_aircraft_type_configs
    ADD CONSTRAINT fbo_aircraft_type_configs_aircraft_type_id_fkey FOREIGN KEY (aircraft_type_id) REFERENCES public.aircraft_types(id);


--
-- Name: fee_rule_overrides fee_rule_overrides_aircraft_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: fbo_user
--

ALTER TABLE ONLY public.fee_rule_overrides
    ADD CONSTRAINT fee_rule_overrides_aircraft_type_id_fkey FOREIGN KEY (aircraft_type_id) REFERENCES public.aircraft_types(id);


--
-- Name: fee_rule_overrides fee_rule_overrides_fee_rule_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: fbo_user
--

ALTER TABLE ONLY public.fee_rule_overrides
    ADD CONSTRAINT fee_rule_overrides_fee_rule_id_fkey FOREIGN KEY (fee_rule_id) REFERENCES public.fee_rules(id);


--
-- Name: fee_rules fee_rules_applies_to_fee_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: fbo_user
--

ALTER TABLE ONLY public.fee_rules
    ADD CONSTRAINT fee_rules_applies_to_fee_category_id_fkey FOREIGN KEY (applies_to_fee_category_id) REFERENCES public.fee_categories(id);


--
-- Name: fuel_orders fuel_orders_assigned_lst_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: fbo_user
--

ALTER TABLE ONLY public.fuel_orders
    ADD CONSTRAINT fuel_orders_assigned_lst_user_id_fkey FOREIGN KEY (assigned_lst_user_id) REFERENCES public.users(id);


--
-- Name: fuel_orders fuel_orders_assigned_truck_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: fbo_user
--

ALTER TABLE ONLY public.fuel_orders
    ADD CONSTRAINT fuel_orders_assigned_truck_id_fkey FOREIGN KEY (assigned_truck_id) REFERENCES public.fuel_trucks(id);


--
-- Name: fuel_orders fuel_orders_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: fbo_user
--

ALTER TABLE ONLY public.fuel_orders
    ADD CONSTRAINT fuel_orders_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id);


--
-- Name: fuel_orders fuel_orders_reviewed_by_csr_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: fbo_user
--

ALTER TABLE ONLY public.fuel_orders
    ADD CONSTRAINT fuel_orders_reviewed_by_csr_user_id_fkey FOREIGN KEY (reviewed_by_csr_user_id) REFERENCES public.users(id);


--
-- Name: fuel_orders fuel_orders_tail_number_fkey; Type: FK CONSTRAINT; Schema: public; Owner: fbo_user
--

ALTER TABLE ONLY public.fuel_orders
    ADD CONSTRAINT fuel_orders_tail_number_fkey FOREIGN KEY (tail_number) REFERENCES public.aircraft(tail_number);


--
-- Name: permission_group_memberships permission_group_memberships_granted_by_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: fbo_user
--

ALTER TABLE ONLY public.permission_group_memberships
    ADD CONSTRAINT permission_group_memberships_granted_by_id_fkey FOREIGN KEY (granted_by_id) REFERENCES public.users(id);


--
-- Name: permission_group_memberships permission_group_memberships_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: fbo_user
--

ALTER TABLE ONLY public.permission_group_memberships
    ADD CONSTRAINT permission_group_memberships_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.permission_groups(id);


--
-- Name: permission_group_memberships permission_group_memberships_permission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: fbo_user
--

ALTER TABLE ONLY public.permission_group_memberships
    ADD CONSTRAINT permission_group_memberships_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES public.permissions(id);


--
-- Name: permission_groups permission_groups_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: fbo_user
--

ALTER TABLE ONLY public.permission_groups
    ADD CONSTRAINT permission_groups_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.permission_groups(id);


--
-- Name: receipt_line_items receipt_line_items_receipt_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: fbo_user
--

ALTER TABLE ONLY public.receipt_line_items
    ADD CONSTRAINT receipt_line_items_receipt_id_fkey FOREIGN KEY (receipt_id) REFERENCES public.receipts(id);


--
-- Name: receipts receipts_created_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: fbo_user
--

ALTER TABLE ONLY public.receipts
    ADD CONSTRAINT receipts_created_by_user_id_fkey FOREIGN KEY (created_by_user_id) REFERENCES public.users(id);


--
-- Name: receipts receipts_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: fbo_user
--

ALTER TABLE ONLY public.receipts
    ADD CONSTRAINT receipts_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id);


--
-- Name: receipts receipts_fuel_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: fbo_user
--

ALTER TABLE ONLY public.receipts
    ADD CONSTRAINT receipts_fuel_order_id_fkey FOREIGN KEY (fuel_order_id) REFERENCES public.fuel_orders(id);


--
-- Name: receipts receipts_updated_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: fbo_user
--

ALTER TABLE ONLY public.receipts
    ADD CONSTRAINT receipts_updated_by_user_id_fkey FOREIGN KEY (updated_by_user_id) REFERENCES public.users(id);


--
-- Name: role_permission_groups role_permission_groups_assigned_by_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: fbo_user
--

ALTER TABLE ONLY public.role_permission_groups
    ADD CONSTRAINT role_permission_groups_assigned_by_id_fkey FOREIGN KEY (assigned_by_id) REFERENCES public.users(id);


--
-- Name: role_permission_groups role_permission_groups_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: fbo_user
--

ALTER TABLE ONLY public.role_permission_groups
    ADD CONSTRAINT role_permission_groups_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.permission_groups(id);


--
-- Name: role_permission_groups role_permission_groups_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: fbo_user
--

ALTER TABLE ONLY public.role_permission_groups
    ADD CONSTRAINT role_permission_groups_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id);


--
-- Name: role_permissions role_permissions_permission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: fbo_user
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES public.permissions(id);


--
-- Name: role_permissions role_permissions_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: fbo_user
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id);


--
-- Name: user_permission_group_assignments user_permission_group_assignments_assigned_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: fbo_user
--

ALTER TABLE ONLY public.user_permission_group_assignments
    ADD CONSTRAINT user_permission_group_assignments_assigned_by_user_id_fkey FOREIGN KEY (assigned_by_user_id) REFERENCES public.users(id);


--
-- Name: user_permission_group_assignments user_permission_group_assignments_permission_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: fbo_user
--

ALTER TABLE ONLY public.user_permission_group_assignments
    ADD CONSTRAINT user_permission_group_assignments_permission_group_id_fkey FOREIGN KEY (permission_group_id) REFERENCES public.permission_groups(id);


--
-- Name: user_permission_group_assignments user_permission_group_assignments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: fbo_user
--

ALTER TABLE ONLY public.user_permission_group_assignments
    ADD CONSTRAINT user_permission_group_assignments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: user_permission_groups user_permission_groups_permission_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: fbo_user
--

ALTER TABLE ONLY public.user_permission_groups
    ADD CONSTRAINT user_permission_groups_permission_group_id_fkey FOREIGN KEY (permission_group_id) REFERENCES public.permission_groups(id);


--
-- Name: user_permission_groups user_permission_groups_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: fbo_user
--

ALTER TABLE ONLY public.user_permission_groups
    ADD CONSTRAINT user_permission_groups_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: user_permissions user_permissions_granted_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: fbo_user
--

ALTER TABLE ONLY public.user_permissions
    ADD CONSTRAINT user_permissions_granted_by_user_id_fkey FOREIGN KEY (granted_by_user_id) REFERENCES public.users(id);


--
-- Name: user_permissions user_permissions_permission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: fbo_user
--

ALTER TABLE ONLY public.user_permissions
    ADD CONSTRAINT user_permissions_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES public.permissions(id);


--
-- Name: user_permissions user_permissions_revoked_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: fbo_user
--

ALTER TABLE ONLY public.user_permissions
    ADD CONSTRAINT user_permissions_revoked_by_user_id_fkey FOREIGN KEY (revoked_by_user_id) REFERENCES public.users(id);


--
-- Name: user_permissions user_permissions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: fbo_user
--

ALTER TABLE ONLY public.user_permissions
    ADD CONSTRAINT user_permissions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: user_roles user_roles_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: fbo_user
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id);


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: fbo_user
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- PostgreSQL database dump complete
--

