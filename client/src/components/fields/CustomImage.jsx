import React from "react";
import { Image } from "primereact/image";

export const CustomImage = ({ src, alt, ...rest }) => {
    const imgSrc = src || `${process.env.PUBLIC_URL}/images/Sin_imagen.jpg`;

    return <Image src={imgSrc} alt={alt} {...rest} />;
};
