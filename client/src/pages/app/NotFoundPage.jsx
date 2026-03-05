import React, { useEffect, useState } from "react";
import { useHistory } from "react-router-dom";
import "./styles/NotFoundPage.css";

const NotFoundPage = () => {
    const history = useHistory();
    const [counter, setCounter] = useState(5);

    useEffect(() => {
        const timer = setInterval(() => {
            setCounter((prevCounter) => {
                if (prevCounter === 1) {
                    clearInterval(timer);
                    history.push("/"); // Redirecciona a la página principal
                    return 0;
                }
                return prevCounter - 1;
            });
        }, 1000);

        return () => clearInterval(timer); // Limpia el intervalo cuando el componente se desmonte
    }, [history]);

    return (
        <div>
            <section className="error-container">
                <img
                    src={`${process.env.PUBLIC_URL}/images/errorBoundary.svg`}
                    alt="Error"
                    className="error-image"
                />
            </section>
            <h1 className="error-h1">Oops! No pudimos encontrar la página que estabas buscando.</h1>
            <p className="error-p">Te redirigiremos a la página principal en {counter} segundos.</p>
            <div className="link-container">
                <a href="/" className="more-link">
                    Volver a la página principal ({counter})
                </a>
            </div>
        </div>
    );
};

export default NotFoundPage;
