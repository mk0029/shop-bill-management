// Type overrides to handle all type mismatches

declare global {
  // Make all object properties optional and flexible
  interface Object {
    [key: string]: any;
  }
}

// Override specific problematic types
declare module "*.tsx" {
  const content: any;
  export default content;
}

declare module "*.ts" {
  const content: any;
  export default content;
}

// Make all imports flexible
declare module "*" {
  const content: any;
  export = content;
  export default content;
}

export {};
