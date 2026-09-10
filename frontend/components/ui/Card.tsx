import type {
  HTMLAttributes,
  ReactNode,
} from "react";
import styles from "./ui.module.css";

type CardElement = "section" | "article" | "div";

export default function Card({
  children,
  as = "section",
  padding = "default",
  interactive = false,
  className = "",
  ...props
}: HTMLAttributes<HTMLElement> & {
  children: ReactNode;
  as?: CardElement;
  padding?: "compact" | "default" | "spacious";
  interactive?: boolean;
}) {
  const paddingClass =
    padding === "compact"
      ? styles.cardCompact
      : padding === "spacious"
        ? styles.cardSpacious
        : styles.cardDefault;

  const classes = [
    styles.card,
    paddingClass,
    interactive ? styles.cardInteractive : "",
    className,
  ].filter(Boolean).join(" ");

  if (as === "article") {
    return <article {...props} className={classes}>{children}</article>;
  }

  if (as === "div") {
    return <div {...props} className={classes}>{children}</div>;
  }

  return <section {...props} className={classes}>{children}</section>;
}
