# Creative Phase: Data Visualization Design

**Date:** May 14, 2025
**Associated Task:** Thorough UI Redesign based on style-guide.md (from `memory-bank/tasks.md`)
**Style Guide:** `memory-bank/style-guide.md`

🎨🎨🎨 ENTERING CREATIVE PHASE: UI/UX Design 🎨🎨🎨

## 1. Concept Description

*   **Concept Name:** Standardized Data Visualization Styles for FBO LaunchPad
*   **Context:** This document provides design guidelines for future data visualizations (charts, graphs) within the FBO LaunchPad application, ensuring they align with the established `style-guide.md`.
*   **Goals:**
    *   Define a consistent visual appearance for common chart types (e.g., bar, line, pie).
    *   Ensure charts are clear, readable, and accessible.
    *   Integrate the application's color palette, typography, and spacing rules into chart design.
    *   Provide a foundation for any future development involving data representation.
*   **Anticipated Chart Types:**
    *   **Bar Charts:** For comparing discrete categories (e.g., fuel sales by type, services rendered per month).
    *   **Line Charts:** For showing trends over time (e.g., monthly revenue, aircraft movements over a quarter).
    *   **Pie/Doughnut Charts:** For representing proportions of a whole (e.g., aircraft status breakdown, service type distribution).
    *   **Data Tables with Inline Visualizations:** (e.g., sparklines, progress bars within table cells) - *Considered a simpler case, primarily using existing table/text styles.*

## 2. Requirements & Constraints

*   **Overall Goal:** Ensure all future data visualizations are professional, easy to understand, and visually integrated with the FBO LaunchPad application's new design system.
*   **Visual Requirements (from `style-guide.md`):**
    *   **Color Palette:** Utilize `Primary` colors for main data series. Employ `Status Colors` (Success, Warning, Error, Info) meaningfully where applicable. Use `Neutral Colors` for axes, gridlines, and labels. Ensure sufficient contrast for all elements, especially in both light and dark modes.
    *   **Typography:** Use Montserrat font. Axis labels, tooltips, and legends should use `Caption` or `Tiny (Label)` sizes. Chart titles (if any, separate from card titles) could use `Small` or `Body`.
    *   **Spacing:** Apply consistent spacing for chart padding, legend positioning, and tooltip margins.
    *   **Interactivity:** Hover states on data points should be clear (e.g., highlight, tooltip).
*   **Accessibility Constraints:**
    *   **Color Contrast:** All chart elements (lines, bars, text) must meet WCAG AA contrast ratios against their backgrounds.
    *   **Alternative Information:** Provide data in tabular format as an alternative for complex charts.
    *   **Keyboard Navigation:** If charts are interactive (e.g., drill-downs, selectable points), these interactions must be keyboard accessible.
    *   **Patterns/Shapes:** For users with color vision deficiencies, consider using patterns (for bar/pie charts) or different point shapes (for line charts) in addition to color to differentiate series, if many series are present.
*   **Tooling Agnostic (Mostly):** These guidelines should be applicable regardless of the charting library chosen (e.g., Chart.js, Recharts, D3.js), focusing on the visual output.

## 3. Design Options & Recommendations for Chart Elements

Instead of full alternative chart designs, this section will focus on styling key elements of charts according to `style-guide.md`.

### 3.1. Color Usage

*   **Single Data Series (Bar/Line):**
    *   **Recommended:** Use `Primary` color (Light: `#2A628F`, Dark: `#4A82AF`).
*   **Multiple Data Series (Bar/Line):**
    *   **Option A (Categorical Palette):**
        1.  `Primary` (`#2A628F` L / `#4A82AF` D)
        2.  A distinct, complementary color - e.g., a Teal or Green if not conflicting with Status colors. *This needs careful selection to ensure harmony and distinctiveness.* Let's propose a safe secondary option: `Info` color, as it's already the primary color. For a third, consider `Success` or a desaturated `Warning` if contextually appropriate and not confusing.
        3.  If more colors are needed, use lighter/darker tints of `Primary` or the chosen secondary/tertiary colors, ensuring good contrast.
    *   **Option B (Monochromatic/Analogous):** Use `Primary` and then progressively lighter tints (e.g., `Primary` -> 75% opacity `Primary` -> 50% opacity `Primary`). Or `Primary`, `Primary Light`, and a darker shade of `Primary Light`.
        *   **Pros:** Inherently harmonious.
        *   **Cons:** Can be hard to distinguish if tints are too close, especially for color-blind users.
    *   **Recommendation for Multiple Series:** Start with **Option A**, using `Primary` and `Info` as the first two distinct colors. If a third is needed, `Success` can be an option. For more than 3-4 series, strongly consider if the chart becomes too complex or if data should be presented differently. Prioritize clarity.
*   **Pie/Doughnut Charts:**
    *   Use a selection of `Primary`, `Info`, `Success`, `Warning` (if appropriate and meaning is clear, e.g., "Overdue" segment). Avoid `Error` color unless specifically indicating an error state in the data proportion.
    *   Ensure distinct colors for adjacent segments.
*   **Gridlines & Axes:**
    *   **Recommended:** `Border` color (Light: `#DEE2E6`, Dark: `#2D3339`). Should be subtle.
*   **Tooltips:**
    *   **Background:** `Surface` (Light: `#FFFFFF`, Dark: `#1E2124`) with a `Border`.
    *   **Text:** `Text Primary`.

### 3.2. Typography

*   **Chart Title (if part of the chart canvas, not the card title):** `Small` (14px, Regular) or `Body` (15px, Regular). Color: `Text Primary`.
*   **Axis Labels & Legend Text:** `Caption` (13px, Regular) or `Tiny (Label)` (12px, Medium). Color: `Text Secondary`.
*   **Data Point Labels (if displayed directly on bars/lines):** `Tiny (Label)` (12px, Medium). Color: `Text Primary` (if on a light bar) or `White` (if on a dark bar, ensuring contrast).
*   **Tooltip Text:** Title: `Small` (14px, Semibold). Value: `Small` (14px, Regular).

### 3.3. Interactivity & Hover States

*   **Bar/Line Point Hover:**
    *   **Recommended:** Slightly darken or lighten the bar/point color (e.g., 10-15% shift). Or, increase stroke width for lines/points.
    *   Display a tooltip (styled as per 3.1 and 3.2).
*   **Pie Segment Hover:**
    *   **Recommended:** Slightly extrude the segment outwards or apply a subtle shadow/highlight border using `Primary Dark`.
    *   Display a tooltip.
*   **Legends:**
    *   Clickable legend items (to toggle series visibility) should have a clear hover state (e.g., text underline or slight background change on the legend item marker). Inactive series in legend: reduced opacity for text/marker.

### 3.4. General Chart Structure

*   **Padding:** Ensure adequate internal padding within the chart canvas so elements aren't cramped against axes. Use `md` (16px) as a guideline.
*   **No Data State for Charts:**
    *   Follow the `EmptyState` component design (from `memory-bank/creative-EmptyStates.md`).
    *   Icon: `BarChartHorizontalBig`, `PieChart`, or `AreaChart`.
    *   Title: "Not Enough Data to Display Chart".
    *   Message: "Data will appear here once [relevant condition is met]."

## 4. Example Application (Conceptual)

**Scenario:** A Bar Chart showing "Fuel Sales by Type (Last 30 Days)"

*   **Container:** Wrapped in a `Card` component (styled per style guide and `creative-DashboardRedesign.md`). Card Title: "Fuel Sales: Last 30 Days" (H3).
*   **Colors:**
    *   Bars (Jet A, 100LL, SAF): `Primary`, `Info`, `Success` (assuming these are distinct categories).
    *   Axes/Gridlines: `Border` color.
    *   Axis Labels/Legend: `Text Secondary`, `Caption` font size.
*   **Typography:**
    *   Axis labels: Montserrat, 13px, `Text Secondary`.
    *   Tooltip: Montserrat, title 14px Semibold, value 14px Regular.
*   **Interaction:**
    *   Hovering over a bar darkens it slightly and shows a tooltip with "Fuel Type: [Name], Sales: [Value]".
*   **Dark Mode:** All colors seamlessly transition to their dark mode equivalents from `style-guide.md`.

## 5. Implementation Guidelines

1.  **Charting Library Configuration:**
    *   When integrating a charting library (e.g., Chart.js, Recharts), utilize its API to customize colors, fonts, and tooltips to match these guidelines.
    *   Most libraries allow passing functions or objects to control rendering of labels, tooltips, etc., which is where specific font sizes and colors can be applied.
2.  **CSS Overrides (Sparingly):**
    *   If the library doesn't allow full customization via its API, targeted CSS overrides might be necessary. Scope these carefully to avoid unintended side effects.
3.  **Reusable Chart Wrapper Component:**
    *   Consider creating a `BaseChartWrapper` component that handles common aspects like applying a title (if needed), 'no data' state, and potentially common configuration options for the chosen charting library.
4.  **Accessibility Implementation:**
    *   Ensure chart libraries are configured to output ARIA attributes where appropriate.
    *   Provide data tables as fallbacks for complex charts.
    *   Test keyboard navigation if charts have interactive elements.

## 6. Verification Checkpoint

*   [ ] Do the data visualization guidelines align with `style-guide.md`? (Yes)
*   [ ] Are common chart types and their key elements addressed? (Yes)
*   [ ] Are color, typography, and interactivity guidelines clear? (Yes)
*   [ ] Are accessibility considerations included? (Yes)
*   [ ] Is the guidance adaptable to common charting libraries? (Yes)

🎨🎨🎨 EXITING CREATIVE PHASE (for Data Visualization Design) 🎨🎨🎨 