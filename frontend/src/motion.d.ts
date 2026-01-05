import "framer-motion";

declare module "framer-motion" {
    export interface HTMLMotionProps<TagName extends keyof React.JSX.IntrinsicElements> {
        initial?: any;
        animate?: any;
        exit?: any;
        transition?: any;
        variants?: any;
        whileHover?: any;
        whileTap?: any;
        layout?: any;
        layoutId?: any;
    }
}
