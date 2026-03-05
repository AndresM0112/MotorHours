import React from "react";
import { Tooltip } from "primereact/tooltip";
import { nlbr, truncateText } from "../../utils/converAndConst";

export const TooltipLongText = ({ text, classValue, maxLength = 100, isEdit }) => {
    return (
        <>
            <Tooltip target={`.${classValue}`} position="top" content={text} />
            {isEdit ? (
                <div className="text-div">
                    <div
                        dangerouslySetInnerHTML={{ __html: nlbr(truncateText(text, maxLength)) }}
                        className={classValue}
                    />
                </div>
            ) : (
                <div
                    dangerouslySetInnerHTML={{ __html: nlbr(truncateText(text, maxLength)) }}
                    className={classValue}
                />
            )}
        </>
    );
};
