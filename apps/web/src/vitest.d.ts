// Makes @testing-library/jest-dom's custom matchers (toBeInTheDocument,
// toHaveTextContent, …) visible to `tsc` in co-located *.test.tsx files.
// The matchers are registered at runtime in vitest.setup.ts; this ambient
// import applies the corresponding Vitest `expect` type augmentation across
// the compilation. It lives under src/ because tsconfig only includes src,
// so importing the augmentation from the root setup file isn't enough for tsc.
import "@testing-library/jest-dom/vitest";
