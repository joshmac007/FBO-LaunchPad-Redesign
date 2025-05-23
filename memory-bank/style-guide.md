# FBO LaunchPad - Style Guide

**Version:** 1.0
**Last Updated:** May 13, 2025

**Purpose:** This style guide provides detailed specifications for the FBO LaunchPad application, covering both light and dark modes. It is based on the established design system from the CSR dashboard and aims to ensure a consistent, modern, professional, and user-friendly experience. Adherence to this guide is crucial for all UI/UX development.

## 1. Color Palette

**Philosophy:** The color system is designed for clarity and adaptability, offering distinct palettes for light and dark modes to ensure optimal readability and visual appeal in different user environments. Colors are chosen to be professional and support a clear visual hierarchy.

### 1.1. Primary Colors

| Color Name    | Light Mode (`#Hex`) | Dark Mode (`#Hex`) | Usage                                                      |
| :------------ | :------------------ | :----------------- | :--------------------------------------------------------- |
| Primary       | `#2A628F`           | `#4A82AF`          | Brand color, primary buttons, links, active states         |
| Primary Light | `#b9d9f5`           | `#1A3A5F`          | Backgrounds for highlighted/secondary elements, hover states |
| Primary Dark  | `#0050b3`           | `#0050b3`          | Focus states, important actions (consider contrast)        |

### 1.2. Neutral Colors

| Color Name     | Light Mode (`#Hex`) | Dark Mode (`#Hex`) | Usage                                   |
| :------------- | :------------------ | :----------------- | :-------------------------------------- |
| Background     | `#FFFFFF`           | `#171A1D`          | Overall page background                 |
| Surface        | `#F8F9FA`           | `#1E2124`          | Card backgrounds, elevated surfaces     |
| Border         | `#DEE2E6`           | `#2D3339`          | Dividers, borders                       |
| Text Primary   | `#2D3339`           | `#F8FAFC`          | Primary text content                    |
| Text Secondary | `#525F7F`           | `#A0AEC0`          | Secondary text, labels, inactive icons  |
| Text Muted     | `#868e96`           | `#6c757d`          | Placeholder text, disabled states       |

### 1.3. Status Colors

These colors are generally consistent across light and dark modes to maintain their semantic meaning.

| Color Name | Hex Code  | Usage                                  |
| :--------- | :-------- | :------------------------------------- |
| Success    | `#65D14D` | Success states, completed actions      |
| Warning    | `#ec8f33` | Warning states, pending actions        |
| Error      | `#d64f4a` | Error states, destructive actions      |
| Info       | `#2A628F` (Light) / `#4A82AF` (Dark) | Information, in-progress states (uses Primary) |

## 2. Typography

**Philosophy:** Typography is based on Montserrat for a modern and highly readable interface. A clear typographic scale and consistent font weights are used to establish visual hierarchy and guide the user.

### 2.1. Font Family
* **Primary Font:** Montserrat (Fallback: sans-serif)
* **CSS Import:** `@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap');` (Ensure all used weights are imported)
* **CSS Stack:** `font-family: "Montserrat", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;`

### 2.2. Font Weights
* Regular: `400`
* Medium: `500`
* Semibold: `600`
* Bold: `700`

### 2.3. Typographic Scale

| Element         | Size      | Weight    | Line Height | Usage                             |
| :-------------- | :-------- | :-------- | :---------- | :-------------------------------- |
| H1 (Page Title) | `26px`    | `700` (Bold) | `1.2`       | Main page titles                  |
| H2 (Section)    | `18px`    | `600` (Semibold) | `1.3`       | Section headings                  |
| H3 (Card/Sub)   | `16px`    | `600` (Semibold) | `1.4`       | Card titles, subsections          |
| Body            | `16px`    | `400` (Regular) | `1.6`       | Main content text                 |
| Small           | `14px`    | `400` (Regular) | `1.5`       | Secondary text (e.g., user details) |
| Caption         | `13px`    | `400` (Regular) | `1.4`       | Helper text, captions, metadata   |
| Tiny (Label)    | `12px`    | `500` (Medium)  | `1.4`       | Small labels, badges              |

### Body Text
- **Font Family:** Montserrat (Fallback: sans-serif)
- **Weight:** Regular (400), Medium (500)
- **Size:** 16px (`text-base`)
- **Line Height:** 1.6 (`leading-relaxed`)
- **Color:** `neutral-text-primary` (light mode), `neutral-text-primary-dark` (dark mode)

## 3. Spacing & Sizing

The design system uses a 4px base unit for spacing and sizing. Consistent spacing is key to a clean and readable UI.

- **Base Spacing Unit:** 4px (Tailwind: `1` unit, e.g., `p-1`, `m-1`, `space-x-1`, `gap-1`)
- **Scale:**
    - `xs`: 8px (Tailwind: `2` units, e.g., `p-2`, `m-2`)
    - `sm`: 12px (Tailwind: `3` units, e.g., `p-3`, `m-3`)
    - `md`: 16px (Tailwind: `4` units, e.g., `p-4`, `m-4`) - *Standard paragraph spacing, component internal padding*
    - `lg`: 24px (Tailwind: `6` units, e.g., `p-6`, `m-6`) - *Section padding, larger gaps*
    - `xl`: 32px (Tailwind: `8` units, e.g., `p-8`, `m-8`)
    - `2xl`: 48px (Tailwind: `12` units, e.g., `p-12`, `m-12`)

**Tailwind Usage:**
- Use padding utilities (`p-`, `px-`, `py-`, `pt-`, `pr-`, `pb-`, `pl-`) for internal spacing within components.
- Use margin utilities (`m-`, `mx-`, `my-`, `mt-`, `mr-`, `mb-`, `ml-`) for external spacing between components.
- Use gap utilities (`gap-`, `gap-x-`, `gap-y-`) for spacing between grid and flex items.
- Use space utilities (`space-x-`, `space-y-`) for spacing between direct child elements.

*(Note: The table format for spacing was removed for clarity and replaced with a list format for better alignment with Tailwind unit descriptions.)*

### Color Palette & Tailwind
- **Primary Colors:** Defined in `tailwind.config.js` (e.g., `primary`, `secondary`) and correspond to CSS variables in `src/styles/global.css` (e.g., `var(--primary)`).
- **Neutral Colors:** Defined similarly (e.g., `neutral-background`, `neutral-text-primary`).
- **Accent Colors:** Defined similarly (e.g., `accent-info`, `accent-success`).

**Note on Tailwind Implementation:** Colors in `tailwind.config.js` are mapped to CSS variables (e.g., `primary: 'var(--primary)'`). These CSS variables are then defined in `src/styles/global.css` for both light and dark themes. This allows for dynamic theme switching while leveraging Tailwind's utility classes. For example, `bg-primary` will correctly apply the primary background color based on the active theme. This is the established and correct pattern.

## 4. Border Radius & Shadows

### 4.1. Border Radius
* **Cards:** `8px` (e.g., Tailwind `rounded-lg`)
* **Buttons:** `6px` (e.g., Tailwind `rounded-md`)
* **Input Fields:** `6px` (e.g., Tailwind `rounded-md`)
* **Tabs Container:** `8px`
* **Individual Tab:** `6px`
* **Status Dots:** `50%` (fully rounded)

### 4.2. Shadows & Depth
* **Cards (Light Mode):** No explicit shadow mentioned, defined by `border: 1px solid #DEE2E6;`. Hover adds `transform: translateY(-2px);`.
* **Cards (Dark Mode):** No explicit shadow, defined by `border: 1px solid #2D3339;`. Hover adds `transform: translateY(-2px);`.
* **Input Focus (Light Mode):** `box-shadow: 0 0 0 2px rgba(42, 98, 143, 0.2);`
* **Input Focus (Dark Mode):** `box-shadow: 0 0 0 2px rgba(74, 130, 175, 0.2);`
* **General Philosophy:** Depth is primarily achieved through layering of surfaces with different background colors and subtle borders, rather than heavy shadows. Hover effects provide interactive depth.

## 5. Iconography

**Philosophy:** Lucide React icons are used exclusively for consistency, clarity, and a modern feel. Icons should be sized appropriately for their context.

* **Icon System:** Lucide React ([https://lucide.dev/](https://lucide.dev/))
* **Default Color (Light Mode):** `Text Secondary` (`#525F7F`)
* **Default Color (Dark Mode):** `Text Secondary` (`#A0AEC0`)
* **Active/Primary Color:** `Primary` (`#2A628F` Light / `#4A82AF` Dark)

### Icon Sizes

| Size Name | Dimensions    | Suggested Usage                     |
| :-------- | :------------ | :---------------------------------- |
| `xs`      | `16px × 16px` | Inline with text, very small buttons |
| `sm`      | `20px × 20px` | Standard UI elements, list items    |
| `md`      | `24px × 24px` | Primary navigation, larger buttons  |
| `lg`      | `32px × 32px` | Feature highlights, empty states    |

**Example Usage (Lucide React):**
```jsx
import { Bell } from 'lucide-react';
// <Bell className="h-5 w-5 text-[#525F7F] dark:text-[#A0AEC0]" />
// For dynamic color based on mode, use CSS variables or conditional classes.
````

## 6\. Key Component Styles

**Note:** CSS examples below are illustrative. Actual implementation may use utility classes (e.g., Tailwind CSS) or styled-components, but should achieve the specified visual outcome.

### 6.1. Cards

  * **Light Mode:**
      * Background: `Background` (`#FFFFFF`)
      * Border: `1px solid Border` (`#DEE2E6`)
  * **Dark Mode:**
      * Background: `Surface` (`#1E2124`)
      * Border: `1px solid Border` (`#2D3339`)
  * **Common:**
      * Border Radius: `8px`
      * Padding: `lg` (`24px`)
      * Transition: `transform 0.2s, box-shadow 0.2s`
      * Hover: `transform: translateY(-2px)`

### 6.2. Buttons

#### Primary Button

  * **Light Mode:**
      * Background: `Primary` (`#2A628F`)
      * Text Color: `#FFFFFF`
      * Hover Background: `#1A4D78` (Darker shade of Primary)
  * **Dark Mode:**
      * Background: `Primary` (`#4A82AF`)
      * Text Color: `#FFFFFF` (or a very light Text Primary for Dark Mode if contrast is an issue)
      * Hover Background: `#5A92BF` (Lighter/Brighter shade of Primary for Dark Mode)
  * **Common:**
      * Font Weight: `500` (Medium)
      * Padding: `sm` (`8px`) vertically, `md` (`16px`) horizontally
      * Border Radius: `6px`
      * Border: None
      * Height: `40px`
      * Transition: `all 0.2s`
      * Hover: `transform: translateY(-1px)`

#### Secondary Button

  * **Light Mode:**
      * Background: `#F0F2F5` (A very light gray, slightly darker than `Background`)
      * Text Color: `Text Primary` (`#2D3339`)
      * Border: `1px solid Border` (`#DEE2E6`)
      * Hover Background: `#E5E8ED`
  * **Dark Mode:**
      * Background: `#252A2E` (Slightly lighter than `Surface` Dark Mode)
      * Text Color: `Text Primary` (`#F8FAFC`)
      * Border: `1px solid Border` (`#2D3339`)
      * Hover Background: `#303740`
  * **Common:**
      * Font Weight: `500` (Medium)
      * Padding: `sm` (`8px`) vertically, `md` (`16px`) horizontally
      * Border Radius: `6px`
      * Height: `40px`
      * Transition: `all 0.2s`

### 6.3. Tabs

  * **Container (Light Mode):** Background `Background` (`#F8F9FA`), Padding `xs` (`4px`), Border Radius `8px`.
  * **Container (Dark Mode):** Background `#252A2E`, Padding `xs` (`4px`), Border Radius `8px`.
  * **Individual Tab (Common):** Padding `sm` (`8px`) vertically, `md` (`16px`) horizontally, Font Weight `500` (Medium), Font Size `Small` (`14px`), Border Radius `6px`, Transition `all 0.2s`.
  * **Individual Tab (Light Mode - Inactive):** Text Color `Text Secondary` (`#525F7F`).
  * **Individual Tab (Light Mode - Active):** Background `Surface` (`#FFFFFF`), Text Color `Text Primary` (`#2D3339`).
  * **Individual Tab (Dark Mode - Inactive):** Text Color `Text Secondary` (`#A0AEC0`).
  * **Individual Tab (Dark Mode - Active):** Background `Surface` (`#1E2124`), Text Color `Text Primary` (`#F8FAFC`).

### 6.4. Status Indicators (Dots)

  * **Common:** `width: 8px; height: 8px; border-radius: 50%; margin-right: 8px;`
  * **Pending:** Background `Warning` (`#ec8f33`)
  * **In Progress:** Background `Info` (`#2A628F` Light / `#4A82AF` Dark)
  * **Completed:** Background `Success` (`#65D14D`)

### 6.5. Form Elements (Input Fields)

  * **Light Mode:**
      * Background: `Surface` (`#FFFFFF`)
      * Border: `1px solid Border` (`#DEE2E6`)
      * Text Color: `Text Primary` (`#2D3339`)
      * Focus: Border Color `Primary` (`#2A628F`), `box-shadow: 0 0 0 2px rgba(42, 98, 143, 0.2)`
  * **Dark Mode:**
      * Background: `#252A2E`
      * Border: `1px solid Border` (`#2D3339`)
      * Text Color: `Text Primary` (`#F8FAFC`)
      * Focus: Border Color `Primary` (`#4A82AF`), `box-shadow: 0 0 0 2px rgba(74, 130, 175, 0.2)`
  * **Common:**
      * Height: `40px`
      * Padding: `sm` (`8px`) vertically, `12px` horizontally
      * Border Radius: `6px`
      * Font Size: `Small` (`14px`)
      * Transition: `all 0.2s`
      * Focus: `outline: none`

## 7\. Layout Guidelines

### 7.1. Container

  * `max-width: 1280px;`
  * `margin: 0 auto;`
  * Horizontal Padding: `lg` (`24px`)

### 7.2. Grid System

  * Utilize a 12-column responsive grid.
  * Gap: `lg` (`24px`).
  * **Responsive Adjustments:**
      * Tablet (e.g., `<1024px` or `<768px`): Adjust to 6 or 8 columns.
      * Mobile (e.g., `<640px`): Adjust to 4 columns or single column flow.

### 7.3. Responsive Breakpoints (Examples)

  * **Mobile:** `< 640px`
  * **Tablet:** `640px - 1024px`
  * **Desktop:** `> 1024px`

## 8\. Navigation & Header

### 8.1. Header

  * **Height:** `64px`
  * **Padding:** Horizontal `lg` (`24px`)
  * **Light Mode:** Background `Surface` (`#FFFFFF`), Border Bottom `1px solid Border` (`#DEE2E6`)
  * **Dark Mode:** Background `Surface` (`#1E2124`), Border Bottom `1px solid Border` (`#2D3339`)
  * Alignment: `display: flex; align-items: center;`

### 8.2. Navigation Items (General Nav, not Sidebar)

  * **Padding:** `sm` (`8px`) vertically, `md` (`16px`) horizontally
  * **Border Radius:** `6px`
  * **Font Weight:** `500` (Medium)
  * **Transition:** `all 0.2s`
  * **Light Mode - Inactive:** Text Color `Text Secondary` (`#525F7F`), Hover Background `#F0F2F5`
  * **Light Mode - Active:** Background `Surface` (`#FFFFFF`), Text Color `Primary` (`#2A628F`)
  * **Dark Mode - Inactive:** Text Color `Text Secondary` (`#A0AEC0`), Hover Background `#252A2E`
  * **Dark Mode - Active:** Background `Primary Light` (`#1A3A5F`), Text Color `Text Primary` (`#F8FAFC`)

## 9\. Animation & Transition Guidelines

**Philosophy:** Animations and transitions should be subtle and smooth, enhancing user experience without being distracting. They should provide feedback and guide attention.

### 9.1. Standard Transitions

  * Apply to `background-color`, `border-color`, `color`, `transform`, `box-shadow`.
  * Duration: `0.3s` (adjust for specific effects, e.g., `0.2s` for hovers).
  * Timing Function: `cubic-bezier(0.4, 0, 0.2, 1)` (Tailwind's default ease-in-out).

### 9.2. Hover Effects (Interactive Elements)

  * `transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);` (Slight "pop" effect)
  * On Hover: `transform: translateY(-2px);`
  * On Active/Press: `transform: translateY(1px);`

### 9.3. Page Transitions (If applicable)

  * **Enter:** `opacity: 0; transform: translateY(10px);`
  * **Enter Active:** `opacity: 1; transform: translateY(0); transition: opacity 0.3s, transform 0.3s;`
  * **Exit:** `opacity: 1;`
  * **Exit Active:** `opacity: 0; transition: opacity 0.3s;`

### 9.4. Reduced Motion

  * Implement `prefers-reduced-motion: reduce` media query to minimize or disable animations for users who prefer it.
    ```css
    @media (prefers-reduced-motion: reduce) {
      * {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
        scroll-behavior: auto !important;
      }
    }
    ```

## 10\. Accessibility (A11y) Specifics

**Philosophy:** Design and build for everyone. Accessibility is a core requirement, not an afterthought.

### 10.1. Color Contrast

  * All text combinations **MUST** meet WCAG AA minimums:
      * Normal text: 4.5:1
      * Large text (18pt/24px regular, or 14pt/18.5px bold): 3:1
  * UI components and graphical objects: 3:1 against adjacent colors.
  * Use tools to verify contrast with the defined color palette.

### 10.2. Focus States

  * All interactive elements **MUST** have a clearly visible focus state.
  * **Light Mode Focus:** `outline: 2px solid #2A628F; outline-offset: 2px;` (or use `box-shadow` as per input example)
  * **Dark Mode Focus:** `outline: 2px solid #4A82AF; outline-offset: 2px;` (or use `box-shadow`)

### 10.3. Semantic HTML & ARIA

  * Use HTML elements for their correct semantic purpose.
  * Use ARIA attributes appropriately to enhance accessibility for dynamic content and advanced UI controls when native HTML is insufficient.

## 11\. Implementation Examples (React/CSS from user output)

*(This section is for reference and shows how the styles translate to code. The primary definitions are above.)*

### Header Redesign

```jsx
// <header className="h-16 bg-white dark:bg-[#1E2124] border-b border-[#DEE2E6] dark:border-[#2D3339] flex items-center justify-between px-6">
//   ... (content as provided by user) ...
// </header>
```

**Style Guide Mapping:**

  * `h-16`: Corresponds to Header Height `64px`.
  * `bg-white dark:bg-[#1E2124]`: Uses `Surface` colors for Light/Dark mode.
  * `border-b border-[#DEE2E6] dark:border-[#2D3339]`: Uses `Border` colors.
  * `px-6`: Uses `lg` (`24px`) horizontal padding.

### Status Cards Redesign

```jsx
// <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
//   <div className="bg-white dark:bg-[#1E2124] rounded-lg border border-[#DEE2E6] dark:border-[#2D3339] overflow-hidden">
//     <div className="p-6">
//       ... (content for Pending Orders Card as provided) ...
//     </div>
//   </div>
//   ... (Other cards) ...
// </div>
```

**Style Guide Mapping:**

  * `gap-6`: Uses `lg` (`24px`) grid gap.
  * `mb-8`: Uses `xl` (`32px`) margin bottom.
  * `bg-white dark:bg-[#1E2124]`: Uses `Surface` colors.
  * `rounded-lg`: Uses `8px` border radius.
  * `border border-[#DEE2E6] dark:border-[#2D3339]`: Uses `Border` colors.
  * `p-6`: Uses `lg` (`24px`) padding.
  * Icon backgrounds (`bg-[#FFF8E6]`, `bg-[#EBF4FF]`, `bg-[#E6F7EE]`) are specific tints derived from status colors (Warning, Info/Primary, Success respectively) – these could be added to the palette as `Status-Background-Warning`, etc.
  * Icon colors match their respective `Status` colors.

*(Other component examples like Fuel Orders, Receipts, Footer can be similarly mapped and included if needed, or kept in separate component documentation that references this style guide.)*

```