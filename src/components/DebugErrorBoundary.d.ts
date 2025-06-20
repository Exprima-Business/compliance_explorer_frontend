/// <reference types="react/experimental" />
import React from 'react';
interface Props {
    children: React.ReactNode;
}
interface State {
    error: Error | null;
}
export declare class DebugErrorBoundary extends React.Component<Props, State> {
    constructor(props: Props);
    static getDerivedStateFromError(error: Error): State;
    componentDidCatch(error: Error, info: React.ErrorInfo): void;
    render(): string | number | boolean | Iterable<React.ReactNode> | React.PromiseLikeOfReactNode | import("react/jsx-runtime").JSX.Element | null | undefined;
}
export {};
