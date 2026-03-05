import React, { useRef, useState, useEffect } from "react";
import { Avatar } from "primereact/avatar";
// import { Image } from "primereact/image";
import { Button } from "primereact/button";
import { getInitials } from "@utils/converAndConst";

const UserImageUploader = ({
    fullName = "",
    profileName = "",
    imageUrl = null,
    onUpload,
    canUpload = true,
}) => {
    const fileInputRef = useRef(null);
    const [isLoading, setIsLoading] = useState(true);
    const [preview, setPreview] = useState(null);
    const initials = getInitials(fullName);

    useEffect(() => {
        setPreview(imageUrl);

        setTimeout(() => {
            setIsLoading(false);
        }, 500);
    }, [imageUrl]);

    const handleImageSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const image = event.target.result;
                setPreview(image);
                if (onUpload) onUpload(file, image);
            };

            reader.readAsDataURL(file);
        }
    };

    const handleRemove = () => {
        setPreview(null);
        if (onUpload) onUpload(null, null);
    };

    return (
        <div className="user-profile-container border-round overflow-hidden">
            <div
                className="user-profile-banner border-round"
                style={{
                    backgroundImage: `url(${process.env.PUBLIC_URL}/images/banner.jpg)`,
                }}
            >
                <div className="user-profile-avatar-wrapper flex align-items-center justify-content-center">
                    <div className="user-profile-avatar relative border-circle shadow-3">
                        {isLoading && (
                            <div className="absolute w-full h-full flex align-items-center justify-content-center border-circle surface-200 z-2">
                                <i className="pi pi-spinner pi-spin text-3xl text-gray-600" />
                            </div>
                        )}

                        {preview ? (
                            <img
                                src={preview}
                                alt="avatar"
                                style={{
                                    width: "100%",
                                    height: "100%",
                                    objectFit: "cover",
                                    borderRadius: "50%",
                                }}
                            />
                        ) : (
                            <Avatar
                                label={initials}
                                shape="circle"
                                className="w-full h-full text-4xl bg-gray-200"
                            />
                        )}

                        {canUpload && (
                            <div className="user-profile-avatar-actions absolute top-0 left-0 w-full h-full flex align-items-center justify-content-center transition-duration-200">
                                <div className="flex gap-2">
                                    <Button
                                        icon="pi pi-camera"
                                        className="p-button-rounded ml-2"
                                        onClick={() => fileInputRef.current.click()}
                                    />
                                    {preview && (
                                        <Button
                                            icon="pi pi-trash"
                                            className="p-button-rounded p-button-danger ml-2"
                                            onClick={handleRemove}
                                        />
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleImageSelect}
                style={{ display: "none" }}
            />

            <div className="user-profile-info text-center py-3" style={{ marginTop: "35px" }}>
                <h5 className="m-0 text-xl font-bold uppercase">{fullName}</h5>
                <span className="text-sm text-color-secondary uppercase">{profileName}</span>
            </div>
        </div>
    );
};

export default UserImageUploader;
