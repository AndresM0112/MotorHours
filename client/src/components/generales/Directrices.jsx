import React from "react";
import { useForm, Controller } from "react-hook-form";
import { InputNumber } from "primereact/inputnumber";
import { Button } from "primereact/button";
import { classNames } from "primereact/utils";

const Directrices = () => {
    const {
        control,
        handleSubmit,
        formState: { errors },
    } = useForm();

    const onSubmit = (data) => {
        // console.log(
        //     "IPC:",
        //     data.ipc,
        //     "Margen de Error:",
        //     data.margenError,
        //     "Constante:",
        //     data.constante
        // );
    };

    const getFormErrorMessage = (name) => {
        return errors[name] ? <small className="p-error">Campo requerido.</small> : null;
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)}>
            <h4>Parámetros de Cálculo</h4>
            <div className="grid p-fluid mt-4">
                <div className="col-12 md:col-3">
                    <span className="p-float-label">
                        <Controller
                            name="ipc"
                            control={control}
                            rules={{ required: "IPC es requerido." }}
                            render={({ field, fieldState }) => (
                                <InputNumber
                                    id="ipc"
                                    value={field.value}
                                    onValueChange={(e) => field.onChange(e.value)}
                                    mode="decimal"
                                    minFractionDigits={2}
                                    className={classNames({ "p-invalid": fieldState.invalid })}
                                />
                            )}
                        />
                        <label htmlFor="ipc">
                            IPC <span style={{ color: "red" }}>*</span>
                        </label>
                    </span>
                    {getFormErrorMessage("ipc")}
                </div>
                <div className="col-12 md:col-3">
                    <span className="p-float-label">
                        <Controller
                            name="margenError"
                            control={control}
                            rules={{ required: "Margen de Error es requerido." }}
                            render={({ field, fieldState }) => (
                                <InputNumber
                                    id="margenError"
                                    value={field.value}
                                    onValueChange={(e) => field.onChange(e.value)}
                                    mode="decimal"
                                    minFractionDigits={2}
                                    className={classNames({ "p-invalid": fieldState.invalid })}
                                />
                            )}
                        />
                        <label htmlFor="margenError">
                            Margen de Error <span style={{ color: "red" }}>*</span>
                        </label>
                    </span>
                    {getFormErrorMessage("margenError")}
                </div>
                <div className="col-12 md:col-3">
                    <span className="p-float-label">
                        <Controller
                            name="constante"
                            control={control}
                            rules={{ required: "Constante es requerida." }}
                            render={({ field, fieldState }) => (
                                <InputNumber
                                    id="constante"
                                    value={field.value}
                                    onValueChange={(e) => field.onChange(e.value)}
                                    mode="decimal"
                                    minFractionDigits={2}
                                    className={classNames({ "p-invalid": fieldState.invalid })}
                                />
                            )}
                        />
                        <label htmlFor="constante">
                            Constante <span style={{ color: "red" }}>*</span>
                        </label>
                    </span>
                    {getFormErrorMessage("constante")}
                </div>
                <div className="col-12 md:col-3">
                    <Button type="submit" label="Guardar" icon="pi pi-check" className="p-mt-2" />
                </div>
            </div>
        </form>
    );
};

export default Directrices;
