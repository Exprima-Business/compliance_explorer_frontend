/// <reference types="react/experimental" />
import React from 'react';
interface Props {
    children: React.ReactNode;
}
interface State {
    hasError: boolean;
    message: string;
}
export declare class ErrorFallbackBoundary extends React.Component<Props, State> {
    constructor(props: Props);
    static getDerivedStateFromError(error: Error): State;
    componentDidCatch(error: Error, info: React.ErrorInfo): void;
    render(): string | number | boolean | import("react/jsx-runtime").JSX.Element | Iterable<React.ReactNode> | React.PromiseLikeOfReactNode | null | undefined;
}
export {};
