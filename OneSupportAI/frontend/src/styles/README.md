# Styles Organization

This project uses a organized CSS structure for better maintainability:

## Structure

```
src/styles/
├── index.css           # Main entry point that imports all styles
├── globals.css         # Global styles, resets, and utilities
├── components/         # Component-specific styles
│   ├── Header.css
│   ├── Sidebar.css
│   ├── ProductArea.css
│   └── AISidebar.css
└── pages/              # Page-specific styles
    └── HomePage.css
```

## Guidelines

### Global Styles (globals.css)
- CSS resets and normalize
- Global typography and color variables
- Utility classes (buttons, scrollbars)
- Global states (dragging, loading, etc.)

### Component Styles
- Each component has its own CSS file
- Import the CSS file in the component's JSX file
- Use BEM naming convention where applicable
- Keep component styles isolated and reusable

### Page Styles
- Layout styles specific to each page
- Grid/flexbox layouts
- Page-specific responsive breakpoints
- Integration styles between components

## Benefits

1. **Maintainability**: Easy to find and modify specific styles
2. **Modularity**: Components are self-contained with their styles
3. **Scalability**: Easy to add new components and pages
4. **Performance**: Only load styles that are actually used
5. **Team Collaboration**: Different developers can work on different components without conflicts

## Adding New Components

1. Create component JSX file: `src/components/NewComponent.jsx`
2. Create component CSS file: `src/styles/components/NewComponent.css`
3. Import CSS in the component: `import '../styles/components/NewComponent.css';`
4. Add import to `src/styles/index.css` if needed globally

## Adding New Pages

1. Create page JSX file: `src/pages/NewPage.jsx`
2. Create page CSS file: `src/styles/pages/NewPage.css`
3. Import CSS in the page: `import '../styles/pages/NewPage.css';`
4. Add import to `src/styles/index.css` if needed globally
