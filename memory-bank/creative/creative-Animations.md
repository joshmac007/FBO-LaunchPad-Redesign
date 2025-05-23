# Creative Phase: Animation & Micro-interactions Design

**Date:** May 14, 2025
**Associated Task:** Thorough UI Redesign based on style-guide.md (from `memory-bank/tasks.md`)
**Style Guide:** `memory-bank/style-guide.md` (Section 9 primarily)

🎨🎨🎨 ENTERING CREATIVE PHASE: UI/UX Design 🎨🎨🎨

## 1. Concept Description

*   **Concept Name:** Enhanced User Experience through Purposeful Animation & Micro-interactions.
*   **Context:** This document details how to apply and extend the animation guidelines from `style-guide.md` to create a more dynamic, responsive, and engaging user interface for the FBO LaunchPad application.
*   **Goals:**
    *   Provide clear visual feedback for user actions.
    *   Guide user attention to important elements or state changes.
    *   Improve perceived performance and smoothness.
    *   Add a layer of polish and professionalism to the UI.
    *   Ensure all animations are subtle, quick, and non-distracting, adhering to the `prefers-reduced-motion` standard.

## 2. Guiding Principles (from Style Guide & Expanded)

*   **Subtlety is Key:** Animations should enhance, not dominate. Avoid overly complex or lengthy effects.
*   **Purposeful Motion:** Every animation should have a clear purpose (e.g., indicating a state change, drawing attention, confirming an action).
*   **Responsiveness:** Animations should contribute to the feeling of a fast and responsive UI.
*   **Consistency:** Apply similar animation patterns for similar interactions across the application.
*   **Performance:** Prioritize performant CSS transitions and animations (`transform`, `opacity`). Avoid animating layout-heavy properties (e.g., `width`, `height`, `top`/`left`) where possible.
*   **Accessibility:**
    *   Respect `prefers-reduced-motion`. All significant animations should be disabled or minimized when this is active.
    *   Ensure animations don't cause flashing or discomfort (duration and intensity are important).

## 3. Standard Animations (from Style Guide - Section 9) - Application Context

These are the baseline animations to be applied consistently:

*   **Standard Transitions (0.2s - 0.3s, ease-in-out):**
    *   **Buttons:** Background color, border color, box-shadow on hover/focus/active.
    *   **Input Fields:** Border color, box-shadow on focus.
    *   **Navigation Items/Tabs:** Background color, text color on hover/active.
    *   **Card Hovers:** `transform: translateY(-2px)` for the "pop" effect (0.2s).
    *   **Dropdown/Modal Visibility:** Opacity and slight scale/translate for appear/disappear.
*   **Hover Effects (Interactive Elements):**
    *   General interactive elements (e.g., clickable list items, links) should utilize the `transform: translateY(-2px);` on hover and `transform: translateY(1px);` on active/press, with the specified `cubic-bezier(0.34, 1.56, 0.64, 1);` timing for a slight "pop."
*   **Page Transitions:**
    *   Apply the fade + `translateY(10px)` effect for loading new page views/routes. This should be subtle and quick (0.3s).

## 4. New Micro-interaction Options & Recommendations

Here, we explore adding subtle micro-interactions to further enhance the UX.

### Option 1: "Icon Morphing & Subtle Rotations"

*   **Description:** Use subtle animations on icons to provide feedback or indicate state.
    *   **Expand/Collapse Icons (e.g., Chevrons):** Smooth 90 or 180-degree rotation on click (0.2s - 0.3s ease-in-out).
        *   *Style Guide Reference:* Uses Lucide icons, standard transitions.
    *   **Loading Spinners/Icons:** If using an icon as a loading indicator (e.g., `Loader2` from Lucide), ensure a smooth, continuous rotation. For buttons that trigger an async action, the button's internal icon could temporarily change to a spinner.
    *   **Checkbox/Radio Button Checkmark:** Subtle scale-in animation for the checkmark when selected (0.1s - 0.2s).
*   **Pros:**
    *   Provides clear visual cues for interactive states.
    *   Adds a touch of sophistication with minimal distraction.
*   **Cons:**
    *   Overuse or overly complex morphing could be distracting or technically challenging.
*   **Recommendation:** Implement chevron rotations and checkbox/radio animations. Evaluate icon-to-spinner transitions on buttons on a case-by-case basis for clarity.

### Option 2: "Focus & Input Feedback Enhancements"

*   **Description:** Beyond the style guide's border/shadow changes, add subtle effects for form inputs.
    *   **Input Label Animation:** If using floating labels, animate the label's transition from placeholder position to "floating" label position (translate and scale) upon focus or when input has value (0.2s ease-in-out).
        *   *Style Guide Reference:* Relies on typography and color changes, animation adds to it.
    *   **Subtle Input Underline Scale:** On focus, an underline beneath the input field could animate its width from 0 to 100% (0.2s - 0.3s). This would be *in addition* to the box-shadow focus, or as a more minimal alternative if desired for some contexts.
*   **Pros:**
    *   Enhances the sense of interaction with form fields.
    *   Can improve clarity of focus states.
*   **Cons:**
    *   Floating labels can have accessibility challenges if not implemented correctly (ensure label is always programmatically linked). Underline scale might be too much if already using strong box-shadow focus.
*   **Recommendation:** Pursue floating label animation if it fits the overall form design aesthetic chosen during component redesign. Be cautious with the underline scale to avoid over-animating focus states; the style guide's box-shadow is likely sufficient.

### Option 3: "State Change Visual Affirmations"

*   **Description:** Subtle visual cues when an item's state changes, beyond just color or text.
    *   **List Item Add/Remove:** When an item is added to a list, it could subtly fade in and slide down/up into place (0.3s). When removed, it slides out and fades (0.3s).
        *   *Style Guide Reference:* Standard transitions on `opacity` and `transform`.
    *   **Toggle Switch Animation:** The knob of a toggle switch smoothly slides from one side to the other (0.2s ease-in-out), possibly with a slight background color transition of the track.
    *   **Status Indicator Pulse:** A newly appeared status dot (e.g., for a "New" notification) could have a very subtle, slow pulse animation (opacity or scale) for a few seconds to draw initial attention, then settle.
*   **Pros:**
    *   Makes state changes more apparent and satisfying.
    *   Can improve understanding of system actions.
*   **Cons:**
    *   List add/remove animations can be complex to implement correctly with list reordering or virtualization. Pulse animation must be very subtle to avoid annoyance.
*   **Recommendation:** Implement toggle switch animation and list item add/remove animations where feasible (e.g., for user-managed lists). The status indicator pulse should be used sparingly and be extremely subtle if adopted.

## 5. Recommended Approach for New Micro-interactions

Adopt a selection of the above, prioritizing those that offer clear feedback with minimal distraction and easy implementation:

1.  **Chevron Rotations (Option 1):** Implement for all expand/collapse UI elements.
2.  **Checkbox/Radio Button Checkmark Animation (Option 1):** Implement for a more polished feel.
3.  **Toggle Switch Animation (Option 3):** Implement for all toggle switches.
4.  **List Item Add/Remove Animation (Option 3):** Implement where appropriate, especially for user-initiated list modifications (e.g., adding an item to a cart, removing a task). Be mindful of performance on very long lists.
5.  **Floating Label Animation (Option 2):** Consider this during form component redesign. If adopted, ensure accessibility.
6.  **Loading Spinners on Buttons (Option 1):** Use for actions that take noticeable time (>300-500ms) to provide feedback that the action is in progress. The button text could also change (e.g., "Saving...").

## 6. Implementation Guidelines

1.  **Leverage CSS Transitions & Animations:**
    *   Use `transition` property for simple state changes (hover, focus, active).
    *   Use `@keyframes` for more complex sequences (e.g., subtle pulse).
    *   Prioritize `transform` and `opacity` for performance.
2.  **Timing & Easing:**
    *   Adhere to durations specified in `style-guide.md` (0.2s-0.3s).
    *   Use the standard `cubic-bezier(0.4, 0, 0.2, 1)` (ease-in-out) for most transitions, or `cubic-bezier(0.34, 1.56, 0.64, 1)` for "pop" effects.
3.  **JavaScript for State Control:**
    *   Use JavaScript to add/remove CSS classes that trigger animations/transitions based on component state or user interaction.
    *   For list animations, libraries like `Framer Motion` or `React Transition Group` can simplify implementation if already in the project or if complexity warrants. Otherwise, simple CSS class toggles are preferred.
4.  **`prefers-reduced-motion`:**
    *   Wrap all significant custom animations in a `@media (prefers-reduced-motion: reduce)` query to disable or minimize them.
    ```css
    .animated-element {
      transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    @media (prefers-reduced-motion: reduce) {
      .animated-element {
        transition: none;
      }
      /* For keyframe animations, you might set animation-duration: 0.01ms !important; */
    }
    ```
5.  **Testing:**
    *   Test animations across different browsers.
    *   Verify that `prefers-reduced-motion` works as expected.
    *   Ensure animations do not negatively impact usability or perceived performance.

## 7. Verification Checkpoint

*   [ ] Do the animation proposals align with the style guide's philosophy (subtle, purposeful)? (Yes)
*   [ ] Are specific, actionable micro-interactions identified for common UI patterns? (Yes)
*   [ ] Are performance and accessibility (reduced motion) considered? (Yes)
*   [ ] Are the recommendations feasible to implement? (Yes, with a focus on CSS-first approaches)

🎨🎨🎨 EXITING CREATIVE PHASE (for Animation & Micro-interactions Design) 🎨🎨🎨 