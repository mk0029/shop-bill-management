# Schema Update: Handling Dynamic Field Options

This document outlines recent changes to the `fieldDefinition` schema in Sanity. The frontend application needs to be updated to correctly render form fields based on these new definitions.

## Summary of Changes

The `fieldDefinition` schema now includes a conditional `options` field. This field provides a list of choices for specific input types and is **only present** when the `fieldType` is `select`, `multiselect`, or `radio`.

## Field Types and Data Structure

Your frontend code should query for field definitions and dynamically render form elements based on the `fieldType` property.

### 1. Fields with an `options` Array

When the `fieldType` is one of the following, the field definition from Sanity will include an `options` array:

-   `select` (for a dropdown menu)
-   `multiselect` (for a multi-select dropdown or checkboxes)
-   `radio` (for radio buttons)

The `options` array contains objects, each with a `title` (for display text) and a `value` (for the submitted value).

**Example Sanity Data (`fieldType: 'select'`):**
```json
{
  "fieldKey": "colorOptions",
  "fieldLabel": "Available Colors",
  "fieldType": "select",
  "options": [
    { "title": "Red", "value": "red" },
    { "title": "Green", "value": "green" },
    { "title": "Blue", "value": "blue" }
  ]
}
```

**Frontend Implementation:**
Your code should check for the existence of the `options` array. If it's present, iterate over it to generate the `<option>` tags, radio inputs, or multi-select choices.

### 2. Fields without an `options` Array

The following field types **do not** have an `options` array and should be rendered as standard HTML inputs:

-   **`text`**: Render as `<input type="text">`.
-   **`number`**: Render as `<input type="number">`.
-   **`checkbox`**: Render as `<input type="checkbox">`. This field represents a single boolean choice.

**Example Sanity Data (`fieldType: 'text'`):**
```json
{
  "fieldKey": "serialNumber",
  "fieldLabel": "Serial Number",
  "fieldType": "text"
}
```
