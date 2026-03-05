import React from "react";

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        console.error("ErrorBoundary caught an error", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="error-boundary">
                    <img
                        src={`${process.env.PUBLIC_URL}/images/errorBoundary.svg`}
                        alt="Error"
                        className="error-image"
                    />
                    <h1 className="error-text">
                        Lo siento, pero al parecer algo va mal,
                        <br />
                        si el problema persiste
                        <br />
                        por favor no dudes en contactar a soporte.
                    </h1>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
