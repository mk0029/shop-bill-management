import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

type HeadingTag = "h1" | "h2" | "h3" | "h4" | "h5" | "h6";

const headingVariants = cva("text-foreground", {
  variants: {
    // Level-driven sizes. We derive this from the `as` tag.
    level: {
      h1: "scroll-m-20 text-4xl lg:text-5xl font-bold tracking-tight",
      h2: "scroll-m-20 text-3xl lg:text-4xl font-semibold tracking-tight",
      h3: "scroll-m-20 text-2xl lg:text-3xl font-semibold",
      h4: "scroll-m-20 text-xl lg:text-2xl font-semibold",
      h5: "scroll-m-20 text-lg lg:text-xl font-medium",
      h6: "scroll-m-20 text-base lg:text-lg font-medium",
    },
    // Visual tone
    tone: {
      default: "",
      muted: "text-muted-foreground",
      primary: "text-primary",
      secondary: "text-secondary-foreground",
      destructive: "text-destructive",
    },
    // Optional overrides
    weight: {
      normal: "font-normal",
      medium: "font-medium",
      semibold: "font-semibold",
      bold: "font-bold",
    },
    align: {
      left: "text-left",
      center: "text-center",
      right: "text-right",
    },
  },
  defaultVariants: {
    tone: "default",
  },
});

export interface HeadingProps
  extends Omit<VariantProps<typeof headingVariants>, "level">,
    React.HTMLAttributes<HTMLHeadingElement> {
  as?: HeadingTag;
}

const Heading: React.FC<HeadingProps> = ({
  as = "h2",
  className,
  tone,
  weight,
  align,
  children,
  ...rest
}) => {
  const allowedTags: HeadingTag[] = ["h1", "h2", "h3", "h4", "h5", "h6"];
  const Tag: HeadingTag = allowedTags.includes(as) ? as : "h2";

  return (
    <Tag
      className={cn(
        headingVariants({ level: Tag, tone, weight, align }),
        className
      )}
      {...rest}
    >
      {children}
    </Tag>
  );
};

export default Heading;
