// import React, { memo, useMemo, useCallback } from "react";
// import { Calendar } from "primereact/calendar";
// import { InputText } from "primereact/inputtext";
// import { InputTextarea } from "primereact/inputtextarea";
// import { Dropdown } from "primereact/dropdown";
// import { SelectButton } from "primereact/selectbutton";
// import { Checkbox } from "primereact/checkbox";
// import { MultiSelect } from "primereact/multiselect";
// import { useFormContext, Controller } from "react-hook-form";
// import { UploadButton } from "../generales/UploadButton";
// import classNames from "classnames";
// import {
//     propsCalendar,
//     propsCurrencyInput,
//     propsSelect,
//     propsSelectButton,
// } from "@utils/converAndConst";
// import { InputSwitch } from "primereact/inputswitch";
// import { Password } from "primereact/password";
// import { FooterPassword, HeaderPassword } from "../generales/ItemTemplates";
// import CurrencyInput from "react-currency-input-field";
// import { TreeSelect } from "primereact/treeselect";
// import moment from "moment";

// const GenericFormSection = memo(({ fields }) => {
//     const {
//         setValue,
//         watch,
//         control,
//         formState: { errors },
//     } = useFormContext();

//     const renderField = useCallback(
//         (field, index) => {
//             if (!field) return;
//             const error = errors[field.name];
//             const className = classNames({ "p-invalid": error });
//             const labelClassName = classNames({ "p-error": error });

//             const handleFocus = (elm) => {
//                 if (elm && typeof elm.focus === "function") {
//                     elm.focus();
//                 }
//             };

//             switch (field.type) {
//                 case "text":
//                     return (
//                         <div
//                             key={`${field.key}-${index}`}
//                             className={`mt-3 ${field.className ? field.className : "col-12 sm:col-6 md:col-3"
//                                 }`}
//                         >
//                             <Controller
//                                 name={field.name}
//                                 control={control}
//                                 rules={field.validation}
//                                 render={({ field: controllerField }) => (
//                                     <span className="p-float-label">
//                                         <InputText
//                                             {...controllerField}
//                                             {...field.props}
//                                             value={controllerField.value ?? ""}
//                                             className={className}
//                                             disabled={field.disabled}
//                                             keyfilter={field.keyfilter ? field.keyfilter : ""}
//                                             maxLength={field.maxLength ? field.maxLength : 50}
//                                             autoComplete="off"
//                                         />
//                                         <label className={labelClassName}>
//                                             {field.required && (
//                                                 <span style={{ color: "red" }}>*</span>
//                                             )}{" "}
//                                             {field.label}
//                                         </label>
//                                     </span>
//                                 )}
//                             />
//                             {error && <div className="p-error">{error.message}</div>}
//                         </div>
//                     );
//                 case "checkbox":
//                     return (
//                         <div
//                             key={`${field.key}-${index}`}
//                             className={`mt-3 ${field.className ? field.className : "col-12 sm:col-6 md:col-3"
//                                 }`}
//                         >
//                             <Controller
//                                 name={field.name}
//                                 control={control}
//                                 rules={field.validation}
//                                 render={({ field: controllerField }) => (
//                                     <div className="p-field-checkbox">
//                                         <Checkbox
//                                             value={controllerField.value ?? ""}
//                                             inputId={field.name}
//                                             {...controllerField}
//                                             className={className}
//                                             disabled={field.disabled}
//                                             checked={controllerField.value}
//                                             onChange={(e) => controllerField.onChange(e.checked)}
//                                         />
//                                         <label
//                                             htmlFor={field.name}
//                                             className={`${labelClassName}`}
//                                             style={{ marginLeft: "4px" }}
//                                         >
//                                             {field.label}{" "}
//                                             {field.required && (
//                                                 <span style={{ color: "red" }}>*</span>
//                                             )}
//                                         </label>
//                                     </div>
//                                 )}
//                             />
//                             {error && <div className="p-error">{error.message}</div>}
//                         </div>
//                     );

//                 case "numeric":
//                     return (
//                         <div
//                             key={`${field.key}-${index}`}
//                             className={`mt-3 ${field.className ? field.className : "col-12 sm:col-6 md:col-3"}`}
//                         >
//                             <Controller
//                                 name={field.name}
//                                 control={control}
//                                 rules={field.validation}
//                                 render={({ field: controllerField }) => (
//                                     <span className="p-float-label">
//                                         <InputText
//                                             {...controllerField}
//                                             {...field.props}
//                                             value={controllerField.value ?? ""}
//                                             className={className}
//                                             disabled={field.disabled}
//                                             autoComplete="off"
//                                             onChange={(e) => {
//                                                 const val = e.target.value;
//                                                 // Acepta negativos, positivos y decimales
//                                                 if (/^-?\d*\.?\d*$/.test(val)) {
//                                                     controllerField.onChange(val);
//                                                 }
//                                             }}
//                                         />
//                                         <label className={labelClassName}>
//                                             {field.required && <span style={{ color: "red" }}>*</span>} {field.label}
//                                         </label>
//                                     </span>
//                                 )}
//                             />
//                             {error && <div className="p-error">{error.message}</div>}
//                         </div>
//                     );

//                 case "multiselectGroup":
//                     return (
//                         <div
//                             key={`${field.key}-${index}`}
//                             className={`mt-3 ${field.className || "col-12 sm:col-6 md:col-3"}`}
//                         >
//                             <Controller
//                                 name={field.name}
//                                 control={control}
//                                 rules={field.validation}
//                                 render={({ field: controllerField }) => (
//                                     <span className="p-float-label">
//                                         <MultiSelect
//                                             {...propsSelect}
//                                             {...controllerField}
//                                             value={controllerField.value || []}
//                                             options={field.options}
//                                             optionLabel={field.optionLabel}
//                                             optionValue={field.optionValue}
//                                             optionGroupLabel={field.optionGroupLabel}
//                                             optionGroupChildren={field.optionGroupChildren}
//                                             optionGroupTemplate={field.props?.optionGroupTemplate}
//                                             selectedItemTemplate={field.props?.selectedItemTemplate}
//                                             className={className}
//                                             disabled={field.disabled}
//                                             onChange={(e) => controllerField.onChange(e.value)}
//                                             display={field.props?.display}
//                                             filter={field.props?.filter}
//                                             maxSelectedLabels={3}
//                                         />
//                                         <label className={labelClassName}>
//                                             {field.required && (
//                                                 <span style={{ color: "red" }}>*</span>
//                                             )}{" "}
//                                             {field.label}
//                                         </label>
//                                     </span>
//                                 )}
//                             />
//                             {error && <div className="p-error">{error.message}</div>}
//                         </div>
//                     );

//                 case "multiselect":
//                     return (
//                         <div
//                             key={`${field.key}-${index}`}
//                             className={`mt-3 ${field.className ? field.className : "col-12 sm:col-6 md:col-3"
//                                 }`}
//                         >
//                             <Controller
//                                 name={field.name}
//                                 control={control}
//                                 rules={field.validation}
//                                 render={({ field: controllerField }) => (
//                                     <span className="p-float-label">
//                                         <MultiSelect
//                                             {...propsSelect}
//                                             {...field.props}
//                                             {...controllerField}
//                                             value={controllerField.value || []}
//                                             options={field.options}
//                                             className={className}
//                                             disabled={field.disabled}
//                                             onChange={(e) => controllerField.onChange(e.value)}
//                                             ref={handleFocus}
//                                             maxSelectedLabels={3}
//                                             selectedItemsLabel={`${controllerField?.value?.length || 0
//                                                 } Seleccionadas`}
//                                         />
//                                         <label className={labelClassName}>
//                                             {field.required && (
//                                                 <span style={{ color: "red" }}>*</span>
//                                             )}{" "}
//                                             {field.label}
//                                         </label>
//                                     </span>
//                                 )}
//                             />
//                             {error && <div className="p-error">{error.message}</div>}
//                         </div>
//                     );
//                 case "rangeCalendar":
//                     return (
//                         <div
//                             key={`${field.key}-${index}`}
//                             className={`mt-3 ${field.className ? field.className : "col-12 sm:col-6 md:col-3"
//                                 }`}
//                         >
//                             <Controller
//                                 name={field.name}
//                                 control={control}
//                                 rules={field.validation}
//                                 render={({ field: controllerField }) => (
//                                     <span className="p-float-label">
//                                         <Calendar
//                                             {...propsCalendar}
//                                             {...controllerField}
//                                             value={controllerField.value ?? ""}
//                                             selectionMode="range"
//                                             className={className}
//                                             disabled={field.disabled}
//                                             ref={handleFocus}
//                                         />
//                                         <label className={labelClassName}>
//                                             {field.required && (
//                                                 <span style={{ color: "red" }}>*</span>
//                                             )}{" "}
//                                             {field.label}
//                                         </label>
//                                     </span>
//                                 )}
//                             />
//                             {error && <div className="p-error">{error.message}</div>}
//                         </div>
//                     );
//                 case "date":
//                     return (
//                         <div
//                             key={`${field.key}-${index}`}
//                             className={`mt-3 ${field.className ? field.className : "col-12 sm:col-6 md:col-3"
//                                 }`}
//                         >
//                             <Controller
//                                 name={field.name}
//                                 control={control}
//                                 rules={field.validation}
//                                 render={({ field: controllerField }) => {
//                                     return (
//                                         <span className="p-float-label">
//                                             <Calendar
//                                                 {...controllerField}
//                                                 {...field.props}
//                                                 value={controllerField.value ?? ""}
//                                                 onChange={(e) => controllerField.onChange(e.value)}
//                                                 className={className}
//                                                 disabled={field.disabled}
//                                                 ref={handleFocus}
//                                             />
//                                             <label className={labelClassName}>
//                                                 {field.required && (
//                                                     <span style={{ color: "red" }}>*</span>
//                                                 )}{" "}
//                                                 {field.label}
//                                             </label>
//                                         </span>
//                                     );
//                                 }}
//                             />

//                             {error && <div className="p-error">{error.message}</div>}
//                         </div>
//                     );
//                 case "year":
//                     const currentYear = moment().year();
//                     const years = useMemo(
//                         () =>
//                             Array.from(new Array(11), (_, index) => ({
//                                 label: currentYear - index,
//                                 value: currentYear - index,
//                             })),
//                         [currentYear]
//                     );
//                     return (
//                         <div
//                             key={`${field.key}-${index}`}
//                             className={`mt-3 ${field.className ? field.className : "col-12 sm:col-6 md:col-3"
//                                 }`}
//                         >
//                             <Controller
//                                 name={field.name}
//                                 control={control}
//                                 rules={field.validation}
//                                 render={({ field: controllerField }) => (
//                                     <span className="p-float-label">
//                                         {/* <Dropdown
//                                             {...propsSelect}
//                                             {...field.props}
//                                             {...controllerField}
//                                             value={currentYear}
//                                             options={years}
//                                             className={className}
//                                             disabled={field.disabled}
//                                             ref={handleFocus}
//                                         /> */}
//                                         <Dropdown
//                                             {...propsSelect}
//                                             {...field.props}
//                                             className={className}
//                                             disabled={field.disabled}
//                                             options={years}
//                                             optionLabel="label"
//                                             optionValue="value"
//                                             value={controllerField.value ?? null}
//                                             onChange={(e) => controllerField.onChange(e.value)}
//                                             inputRef={handleFocus}
//                                         />
//                                         <label className={labelClassName}>
//                                             {field.required && (
//                                                 <span style={{ color: "red" }}>*</span>
//                                             )}{" "}
//                                             {field.label}
//                                         </label>
//                                     </span>
//                                 )}
//                             />
//                             {error && <div className="p-error">{error.message}</div>}
//                         </div>
//                     );
//                 case "textarea":
//                     return (
//                         <div
//                             key={`${field.key}-${index}`}
//                             className={`mt-3 ${field.className ? field.className : "col-12 mt-3"}`}
//                         >
//                             <Controller
//                                 name={field.name}
//                                 control={control}
//                                 rules={field.validation}
//                                 render={({ field: controllerField }) => (
//                                     <span className="p-float-label">
//                                         <InputTextarea
//                                             {...controllerField}
//                                             value={controllerField.value ?? ""}
//                                             rows={2}
//                                             cols={30}
//                                             className={className}
//                                             disabled={field.disabled}
//                                             autoComplete="off"
//                                             autoResize
//                                         />
//                                         <label className={labelClassName}>
//                                             {field.required && (
//                                                 <span style={{ color: "red" }}>*</span>
//                                             )}{" "}
//                                             {field.label}
//                                         </label>
//                                     </span>
//                                 )}
//                             />
//                             {error && <div className="p-error">{error.message}</div>}
//                         </div>
//                     );
//                 // case "dropdown":
//                 //     return (
//                 //         <div
//                 //             key={`${field.key}-${index}`}
//                 //             className={`mt-3 ${field.className ? field.className : "col-12 sm:col-6 md:col-3"
//                 //                 }`}
//                 //         >
//                 //             <Controller
//                 //                 name={field.name}
//                 //                 control={control}
//                 //                 rules={field.validation}
//                 //                 render={({ field: controllerField }) => (
//                 //                     <span className="p-float-label">
//                 //                         <Dropdown
//                 //                             {...controllerField}
//                 //                             {...propsSelect}
//                 //                             {...field.props}
//                 //                             value={controllerField.value ?? ""}
//                 //                             options={field.options}
//                 //                             className={className}
//                 //                             disabled={field.disabled}
//                 //                             ref={handleFocus}
//                 //                         />
//                 //                         <label className={labelClassName}>
//                 //                             {field.required && (
//                 //                                 <span style={{ color: "red" }}>*</span>
//                 //                             )}{" "}
//                 //                             {field.label}
//                 //                         </label>
//                 //                     </span>
//                 //                 )}
//                 //             />
//                 //             {error && <div className="p-error">{error.message}</div>}
//                 //         </div>
//                 //     );
//                 case "dropdown":
//                     return (
//                         <div
//                             key={`${field.key}-${index}`}
//                             className={`mt-3 ${field.className ? field.className : "col-12 sm:col-6 md:col-3"}`}
//                         >
//                             <Controller
//                                 name={field.name}
//                                 control={control}
//                                 rules={field.validation}
//                                 render={({ field: controllerField }) => (
//                                     <span className="p-float-label">
//                                         <Dropdown
//                                             // ⚠️ orden de spreads: primero presets, luego props del field,
//                                             // y por último forzamos value/onChange/optionLabel/optionValue correctos
//                                             {...propsSelect}
//                                             {...field.props}
//                                             className={className}
//                                             disabled={field.disabled}
//                                             options={field.options}
//                                             optionLabel={field.optionLabel ?? "nombre"}
//                                             optionValue={field.optionValue ?? "id"}
//                                             value={controllerField.value ?? null}          // 👈 jamás ""
//                                             onChange={(e) => {
//                                              controllerField.onChange(e.value);
//                                              // si el author del form pasó un onChange extra, también lo ejecutamos
//                                              if (field.props?.onChange) field.props.onChange(e);
//                                            }}
//                                             onBlur={controllerField.onBlur}
//                                             inputRef={handleFocus}
//                                         />
//                                         <label className={labelClassName}>
//                                             {field.required && <span style={{ color: "red" }}>*</span>} {field.label}
//                                         </label>
//                                     </span>
//                                 )}
//                             />
//                             {error && <div className="p-error">{error.message}</div>}
//                         </div>
//                     );

//                 case "selector":
//                     const SelectorComponent = field.component;
//                     return (
//                         <div
//                             key={`${field.key}-${index}`}
//                             className={`mt-3 ${field.className ? field.className : "col-12 sm:col-6 md:col-3"
//                                 }`}
//                             style={{ width: "100%" }}
//                         >
//                             <label
//                                 htmlFor={field.name}
//                                 className={classNames("block mb-1 font-medium", {
//                                     "p-error": errors[field.name],
//                                 })}
//                             >
//                                 {field.required && <span style={{ color: "red" }}>*</span>}{" "}
//                                 {field.label}
//                             </label>

//                             <SelectorComponent
//                                 name={field.name}
//                                 items={field.options}
//                                 titulo={field.titulo}
//                                 // label={field.label}
//                                 multiSelect={field.multiSelect}
//                                 rules={field.validation}
//                                 renderItem={field.renderItem}
//                                 renderValue={field.renderValue}
//                                 renderActions={field.renderActions}
//                                 onCreateNew={field.onCreateNew}
//                                 filterBy={field.filterBy}
//                                 disabled={field.disabled}
//                                 showClear={field.showClear}
//                             />

//                             {errors[field.name] && (
//                                 <small className="p-error block mt-1">
//                                     {errors[field.name]?.message}
//                                 </small>
//                             )}
//                         </div>
//                     );

//                 case "treeSelect":
//                     return (
//                         <div
//                             key={`${field.key}-${index}`}
//                             className={`mt-3 ${field.className ? field.className : "col-12 sm:col-6 md:col-3"
//                                 }`}
//                         >
//                             <Controller
//                                 name={field.name}
//                                 control={control}
//                                 rules={field.validation}
//                                 render={({ field: controllerField }) => (
//                                     <span className="p-float-label">
//                                         <TreeSelect
//                                             {...controllerField}
//                                             {...field.props}
//                                             value={
//                                                 controllerField.value ||
//                                                 (field.multiple ? [] : null)
//                                             }
//                                             filter
//                                             filterBy={"label"}
//                                             options={field.options}
//                                             className={className}
//                                             disabled={field.disabled}
//                                             onChange={(e) => controllerField.onChange(e.value)}
//                                             selectionMode={
//                                                 field.props?.selectionMode
//                                                     ? field.props.selectionMode
//                                                     : field.multiple
//                                                         ? "multiple"
//                                                         : "single"
//                                             }
//                                             metaKeySelection={false}
//                                         />
//                                         <label className={labelClassName}>
//                                             {field.required && (
//                                                 <span style={{ color: "red" }}>*</span>
//                                             )}{" "}
//                                             {field.label}
//                                         </label>
//                                     </span>
//                                 )}
//                             />
//                             {error && <div className="p-error">{error.message}</div>}
//                         </div>
//                     );

//                 case "upload":
//                     return (
//                         <div
//                             key={`${field.key}-${index}`}
//                             className={`mt-3 ${field.className ? field.className : "col-12 sm:col-6 md:col-3"
//                                 }`}
//                         >
//                             <Controller
//                                 name={field.name}
//                                 control={control}
//                                 render={() => (
//                                     <div>
//                                         <UploadButton
//                                             label={watch(field.name)?.name || field.label}
//                                             onChange={({ target }) =>
//                                                 setValue(field.name, target.files[0])
//                                             }
//                                             className={className}
//                                             disabled={field.disabled}
//                                         />
//                                     </div>
//                                 )}
//                             />
//                         </div>
//                     );
//                 case "selectButton":
//                     return (
//                         <div
//                             key={`${field.key}-${index}`}
//                             className={`mt-3 ${field.className ? field.className : "col-12 sm:col-6 md:col-3"
//                                 }`}
//                         >
//                             <Controller
//                                 name={field.name}
//                                 control={control}
//                                 render={({ field: controllerField }) => (
//                                     <div className="p-inputgroup">
//                                         <span
//                                             className="p-inputgroup-addon pl-1 pr-1 flex justify-content-start align-items-center"
//                                             style={
//                                                 field.styleLabel
//                                                     ? field.styleLabel
//                                                     : { width: "100%" }
//                                             }
//                                         >
//                                             {field.required && (
//                                                 <span style={{ color: "red" }}>*</span>
//                                             )}{" "}
//                                             {field.label}
//                                         </span>
//                                         <SelectButton
//                                             {...propsSelectButton}
//                                             {...controllerField}
//                                             {...field.props}
//                                             value={controllerField.value ?? ""}
//                                             options={field.options}
//                                             className={className}
//                                             disabled={field.disabled}
//                                         />
//                                     </div>
//                                 )}
//                             />
//                         </div>
//                     );
//                 case "custom":
//                     const CustomComponent = field.component;
//                     return (
//                         <div
//                             key={`${field.key}-${index}`}
//                             className={`mt-3 ${field.className ? field.className : "col-12 sm:col-6 md:col-3"
//                                 }`}
//                         >
//                             <Controller
//                                 name={field.name}
//                                 control={control}
//                                 rules={field.validation}
//                                 render={({ field: controllerField }) => (
//                                     <span className="p-float-label">
//                                         <CustomComponent
//                                             {...controllerField}
//                                             {...field.props}
//                                             className={className}
//                                             disabled={field.disabled}
//                                             ref={handleFocus}
//                                         />
//                                         <label className={labelClassName}>
//                                             {field.required && (
//                                                 <span style={{ color: "red" }}>*</span>
//                                             )}{" "}
//                                             {field.label}
//                                         </label>
//                                     </span>
//                                 )}
//                             />
//                         </div>
//                     );

//                 case "checkGroup":
//                     return (
//                         <div
//                             key={`${field.key}-${index}`}
//                             className={`mt-3 ${field.className ? field.className : "col-12 sm:col-6 md:col-3"
//                                 }`}
//                         >
//                             <Controller
//                                 name={field.name}
//                                 control={control}
//                                 rules={field.validation}
//                                 render={({ field: controllerField }) => (
//                                     <div className="p-inputgroup">
//                                         <span className="p-float-label">
//                                             <span className="p-inputgroup-addon">
//                                                 <Checkbox
//                                                     value={controllerField.value ?? ""}
//                                                     disabled={field.disabled}
//                                                     checked={watch(field.valCheck)}
//                                                     onChange={(e) =>
//                                                         setValue(field.valCheck, e.checked)
//                                                     }
//                                                 />
//                                             </span>
//                                             {(() => {
//                                                 switch (field.subType) {
//                                                     case "text":
//                                                         return (
//                                                             <InputText
//                                                                 {...controllerField}
//                                                                 {...field.props}
//                                                                 value={controllerField.value ?? ""}
//                                                                 className={className}
//                                                                 disabled={field.disabled}
//                                                                 keyfilter={
//                                                                     field.keyfilter
//                                                                         ? field.keyfilter
//                                                                         : ""
//                                                                 }
//                                                                 maxLength={
//                                                                     field.maxLength
//                                                                         ? field.maxLength
//                                                                         : 50
//                                                                 }
//                                                                 autoComplete="off"
//                                                             />
//                                                         );
//                                                     // case "dropdown":
//                                                     //     return (
//                                                     //         <Dropdown
//                                                     //             {...propsSelect}
//                                                     //             {...controllerField}
//                                                     //             value={controllerField.value ?? ""}
//                                                     //             options={field.options}
//                                                     //             className={className}
//                                                     //             disabled={field.disabled}
//                                                     //             ref={handleFocus}
//                                                     //         />
//                                                     //     );
//                                                     case "dropdown":
//                                                         return (
//                                                             <Dropdown
//                                                                 {...propsSelect}
//                                                                 {...field.props}
//                                                                 className={className}
//                                                                 disabled={field.disabled}
//                                                                 options={field.options}
//                                                                 optionLabel={field.optionLabel ?? "label"}
//                                                                 optionValue={field.optionValue ?? "value"}
//                                                                 value={controllerField.value ?? null}
//                                                                 onChange={(e) => controllerField.onChange(e.value)}
//                                                                 inputRef={handleFocus}
//                                                             />
//                                                         );
//                                                     case "multiselect":
//                                                         return (
//                                                             <MultiSelect
//                                                                 {...propsSelect}
//                                                                 {...field.props}
//                                                                 {...controllerField}
//                                                                 value={controllerField.value || []}
//                                                                 options={field.options}
//                                                                 className={className}
//                                                                 disabled={field.disabled}
//                                                                 onChange={(e) =>
//                                                                     controllerField.onChange(
//                                                                         e.value
//                                                                     )
//                                                                 }
//                                                                 maxSelectedLabels={3}
//                                                             />
//                                                         );
//                                                     case "calendar":
//                                                         return (
//                                                             <Calendar
//                                                                 {...propsCalendar}
//                                                                 {...controllerField}
//                                                                 {...field.props}
//                                                                 value={controllerField.value ?? ""}
//                                                                 className={className}
//                                                                 disabled={field.disabled}
//                                                                 ref={handleFocus}
//                                                             />
//                                                         );
//                                                     case "textarea":
//                                                         return (
//                                                             <InputTextarea
//                                                                 {...controllerField}
//                                                                 value={controllerField.value ?? ""}
//                                                                 autoResize
//                                                                 rows={1}
//                                                                 cols={30}
//                                                                 className={className}
//                                                                 disabled={field.disabled}
//                                                             />
//                                                         );
//                                                     case "selectButton":
//                                                         return (
//                                                             <div className="p-inputgroup">
//                                                                 <span className="p-inputgroup-addon pl-1 pr-1">
//                                                                     {field.label}
//                                                                 </span>
//                                                                 <SelectButton
//                                                                     {...propsSelectButton}
//                                                                     {...controllerField}
//                                                                     {...field.props}
//                                                                     value={
//                                                                         controllerField.value ?? ""
//                                                                     }
//                                                                     options={field.options}
//                                                                     className={className}
//                                                                     disabled={field.disabled}
//                                                                 />
//                                                             </div>
//                                                         );
//                                                     case "custom":
//                                                         const CustomComponent = field.component;
//                                                         return (
//                                                             <CustomComponent
//                                                                 {...controllerField}
//                                                                 {...field.props}
//                                                                 className={className}
//                                                                 disabled={field.disabled}
//                                                                 ref={handleFocus}
//                                                             />
//                                                         );
//                                                     default:
//                                                         return null;
//                                                 }
//                                             })()}
//                                             {field.subType !== "selectButton" && (
//                                                 <label
//                                                     htmlFor={field.name}
//                                                     className={`${labelClassName} ml-6`}
//                                                 >
//                                                     {field.label}{" "}
//                                                     {field.required && (
//                                                         <span style={{ color: "red" }}>*</span>
//                                                     )}
//                                                 </label>
//                                             )}
//                                         </span>
//                                     </div>
//                                 )}
//                             />
//                             {error && <div className="p-error">{error.message}</div>}
//                         </div>
//                     );

//                 case "inputSwitch":
//                     return (
//                         <div
//                             key={`${field.key}-${index}`}
//                             className={`mt-3 ${field.className ? field.className : "col-12 sm:col-6 md:col-3"
//                                 }`}
//                             style={{ display: "flex", alignItems: "center" }} // Ajustado
//                         >
//                             <Controller
//                                 name={field.name}
//                                 control={control}
//                                 render={({ field: controllerField }) => (
//                                     <div
//                                         className="p-field-checkbox"
//                                         style={{ display: "flex", alignItems: "center" }}
//                                     >
//                                         <InputSwitch
//                                             ref={handleFocus}
//                                             {...controllerField}
//                                             checked={controllerField.value}
//                                             className={className}
//                                             disabled={field.disabled}
//                                             onChange={(e) => controllerField.onChange(e.value)}
//                                         />
//                                         <label
//                                             htmlFor={field.name}
//                                             className={`${labelClassName} ml-2`}
//                                             style={{ marginBottom: 0 }} // Ajustado
//                                         >
//                                             {field.label}{" "}
//                                             {field.required && (
//                                                 <span style={{ color: "red" }}>*</span>
//                                             )}
//                                         </label>
//                                     </div>
//                                 )}
//                             />
//                             {error && <div className="p-error">{error.message}</div>}
//                         </div>
//                     );
//                 case "password":
//                     return (
//                         <div
//                             key={`${field.key}-${index}`}
//                             className={`mt-3 ${field.className ? field.className : "col-12 sm:col-6 md:col-3"
//                                 }`}
//                         >
//                             <Controller
//                                 name={field.name}
//                                 control={control}
//                                 rules={field.validation}
//                                 render={({ field: controllerField }) => (
//                                     <span className="p-float-label">
//                                         <Password
//                                             {...controllerField}
//                                             {...field.props}
//                                             value={controllerField.value ?? ""}
//                                             className={className}
//                                             disabled={field.disabled}
//                                             header={HeaderPassword}
//                                             footer={FooterPassword}
//                                             feedback={field.feedback ?? true}
//                                             ref={handleFocus}
//                                             toggleMask={true}
//                                         />
//                                         <label className={labelClassName}>
//                                             {field.required && (
//                                                 <span style={{ color: "red" }}>*</span>
//                                             )}{" "}
//                                             {field.label}
//                                         </label>
//                                     </span>
//                                 )}
//                             />
//                             {error && <div className="p-error">{error.message}</div>}
//                         </div>
//                     );
//                 case "currency":
//                     return (
//                         <div
//                             key={`${field.key}-${index}`}
//                             className={`mt-3 ${field.className ? field.className : "col-12 sm:col-6 md:col-3"
//                                 }`}
//                         >
//                             <Controller
//                                 name={field.name}
//                                 control={control}
//                                 rules={field.validation}
//                                 render={({ field: controllerField }) => (
//                                     <span className="p-float-label">
//                                         <CurrencyInput
//                                             {...propsCurrencyInput}
//                                             {...controllerField}
//                                             {...field.props}
//                                             onChange={() => null}
//                                             value={controllerField.value}
//                                             className={`p-inputtext p-component text-right ${className}`}
//                                             onValueChange={(v) => controllerField.onChange(v)}
//                                         />
//                                         <label className={labelClassName}>
//                                             {field.required && (
//                                                 <span style={{ color: "red" }}>*</span>
//                                             )}{" "}
//                                             {field.label}
//                                         </label>
//                                     </span>
//                                 )}
//                             />
//                             {error && <div className="p-error">{error.message}</div>}
//                         </div>
//                     );
//                 default:
//                     return null;
//             }
//         },
//         [control, errors, watch, setValue]
//     );

//     return (
//         <div className="grid p-fluid">
//             {fields.map((field, index) => renderField(field, index))}
//         </div>
//     );
// });

// export default GenericFormSection;

import React, { memo, useMemo, useCallback } from "react";
import { Calendar } from "primereact/calendar";
import { InputText } from "primereact/inputtext";
import { InputTextarea } from "primereact/inputtextarea";
import { Dropdown } from "primereact/dropdown";
import { SelectButton } from "primereact/selectbutton";
import { Checkbox } from "primereact/checkbox";
import { MultiSelect } from "primereact/multiselect";
import { useFormContext, Controller } from "react-hook-form";
import { UploadButton } from "../generales/UploadButton";
import classNames from "classnames";
import {
    propsCalendar,
    propsCurrencyInput,
    propsSelect,
    propsSelectButton,
} from "@utils/converAndConst";
import { InputSwitch } from "primereact/inputswitch";
import { Password } from "primereact/password";
import { FooterPassword, HeaderPassword } from "../generales/ItemTemplates";
import CurrencyInput from "react-currency-input-field";
import { TreeSelect } from "primereact/treeselect";
import moment from "moment";

const GenericFormSection = memo(({ fields }) => {
    const {
        setValue,
        watch,
        control,
        formState: { errors },
    } = useFormContext();

    const renderField = useCallback(
        (field, index) => {
            if (!field) return;
            const error = errors[field.name];
            const className = classNames({ "p-invalid": error });
            const labelClassName = classNames({ "p-error": error });

            const handleFocus = (elm) => {
                if (elm && typeof elm.focus === "function") {
                    elm.focus();
                }
            };

            switch (field.type) {
                case "text":
                    return (
                        <div
                            key={`${field.key}-${index}`}
                            className={`mt-3 ${field.className ? field.className : "col-12 sm:col-6 md:col-3"
                                }`}
                        >
                            <Controller
                                name={field.name}
                                control={control}
                                rules={field.validation}
                                render={({ field: controllerField }) => (
                                    <span className="p-float-label">
                                        <InputText
                                            {...controllerField}
                                            {...field.props}
                                            value={controllerField.value ?? ""}
                                            className={className}
                                            disabled={field.disabled}
                                            keyfilter={field.keyfilter ? field.keyfilter : ""}
                                            maxLength={field.maxLength ? field.maxLength : 50}
                                            autoComplete="off"
                                        />
                                        <label className={labelClassName}>
                                            {field.required && (
                                                <span style={{ color: "red" }}>*</span>
                                            )}{" "}
                                            {field.label}
                                        </label>
                                    </span>
                                )}
                            />
                            {error && <div className="p-error">{error.message}</div>}
                        </div>
                    );
                case "checkbox":
                    return (
                        <div
                            key={`${field.key}-${index}`}
                            className={`mt-3 ${field.className ? field.className : "col-12 sm:col-6 md:col-3"
                                }`}
                        >
                            <Controller
                                name={field.name}
                                control={control}
                                rules={field.validation}
                                render={({ field: controllerField }) => (
                                    <div className="p-field-checkbox">
                                        <Checkbox
                                            value={controllerField.value ?? ""}
                                            inputId={field.name}
                                            {...controllerField}
                                            className={className}
                                            disabled={field.disabled}
                                            checked={controllerField.value}
                                            onChange={(e) => controllerField.onChange(e.checked)}
                                        />
                                        <label
                                            htmlFor={field.name}
                                            className={`${labelClassName}`}
                                            style={{ marginLeft: "4px" }}
                                        >
                                            {field.label}{" "}
                                            {field.required && (
                                                <span style={{ color: "red" }}>*</span>
                                            )}
                                        </label>
                                    </div>
                                )}
                            />
                            {error && <div className="p-error">{error.message}</div>}
                        </div>
                    );

                case "numeric":
                    return (
                        <div
                            key={`${field.key}-${index}`}
                            className={`mt-3 ${field.className ? field.className : "col-12 sm:col-6 md:col-3"}`}
                        >
                            <Controller
                                name={field.name}
                                control={control}
                                rules={field.validation}
                                render={({ field: controllerField }) => (
                                    <span className="p-float-label">
                                        <InputText
                                            {...controllerField}
                                            {...field.props}
                                            value={controllerField.value ?? ""}
                                            className={className}
                                            disabled={field.disabled}
                                            autoComplete="off"
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                // Acepta negativos, positivos y decimales
                                                if (/^-?\d*\.?\d*$/.test(val)) {
                                                    controllerField.onChange(val);
                                                }
                                            }}
                                        />
                                        <label className={labelClassName}>
                                            {field.required && <span style={{ color: "red" }}>*</span>} {field.label}
                                        </label>
                                    </span>
                                )}
                            />
                            {error && <div className="p-error">{error.message}</div>}
                        </div>
                    );

                case "multiselectGroup":
                    return (
                        <div
                            key={`${field.key}-${index}`}
                            className={`mt-3 ${field.className || "col-12 sm:col-6 md:col-3"}`}
                        >
                            <Controller
                                name={field.name}
                                control={control}
                                rules={field.validation}
                                render={({ field: controllerField }) => (
                                    <span className="p-float-label">
                                        <MultiSelect
                                            {...propsSelect}
                                            {...controllerField}
                                            value={controllerField.value || []}
                                            options={field.options}
                                            optionLabel={field.optionLabel}
                                            optionValue={field.optionValue}
                                            optionGroupLabel={field.optionGroupLabel}
                                            optionGroupChildren={field.optionGroupChildren}
                                            optionGroupTemplate={field.props?.optionGroupTemplate}
                                            selectedItemTemplate={field.props?.selectedItemTemplate}
                                            className={className}
                                            disabled={field.disabled}
                                            onChange={(e) => controllerField.onChange(e.value)}
                                            display={field.props?.display}
                                            filter={field.props?.filter}
                                            maxSelectedLabels={3}
                                        />
                                        <label className={labelClassName}>
                                            {field.required && (
                                                <span style={{ color: "red" }}>*</span>
                                            )}{" "}
                                            {field.label}
                                        </label>
                                    </span>
                                )}
                            />
                            {error && <div className="p-error">{error.message}</div>}
                        </div>
                    );

                case "multiselect":
                    return (
                        <div
                            key={`${field.key}-${index}`}
                            className={`mt-3 ${field.className ? field.className : "col-12 sm:col-6 md:col-3"
                                }`}
                        >
                            <Controller
                                name={field.name}
                                control={control}
                                rules={field.validation}
                                render={({ field: controllerField }) => (
                                    <span className="p-float-label">
                                        <MultiSelect
                                            {...propsSelect}
                                            {...field.props}
                                            {...controllerField}
                                            value={controllerField.value || []}
                                            options={field.options}
                                            className={className}
                                            disabled={field.disabled}
                                            onChange={(e) => controllerField.onChange(e.value)}
                                            ref={handleFocus}
                                            maxSelectedLabels={3}
                                            selectedItemsLabel={`${controllerField?.value?.length || 0
                                                } Seleccionadas`}
                                        />
                                        <label className={labelClassName}>
                                            {field.required && (
                                                <span style={{ color: "red" }}>*</span>
                                            )}{" "}
                                            {field.label}
                                        </label>
                                    </span>
                                )}
                            />
                            {error && <div className="p-error">{error.message}</div>}
                        </div>
                    );
                case "rangeCalendar":
                    return (
                        <div
                            key={`${field.key}-${index}`}
                            className={`mt-3 ${field.className ? field.className : "col-12 sm:col-6 md:col-3"
                                }`}
                        >
                            <Controller
                                name={field.name}
                                control={control}
                                rules={field.validation}
                                render={({ field: controllerField }) => (
                                    <span className="p-float-label">
                                        <Calendar
                                            {...propsCalendar}
                                            {...controllerField}
                                            value={controllerField.value ?? ""}
                                            selectionMode="range"
                                            className={className}
                                            disabled={field.disabled}
                                            ref={handleFocus}
                                        />
                                        <label className={labelClassName}>
                                            {field.required && (
                                                <span style={{ color: "red" }}>*</span>
                                            )}{" "}
                                            {field.label}
                                        </label>
                                    </span>
                                )}
                            />
                            {error && <div className="p-error">{error.message}</div>}
                        </div>
                    );
                case "date":
                    return (
                        <div
                            key={`${field.key}-${index}`}
                            className={`mt-3 ${field.className ? field.className : "col-12 sm:col-6 md:col-3"
                                }`}
                        >
                            <Controller
                                name={field.name}
                                control={control}
                                rules={field.validation}
                                render={({ field: controllerField }) => {
                                    return (
                                        <span className="p-float-label">
                                            <Calendar
                                                {...controllerField}
                                                {...field.props}
                                                value={controllerField.value ?? ""}
                                                onChange={(e) => controllerField.onChange(e.value)}
                                                className={className}
                                                disabled={field.disabled}
                                                ref={handleFocus}
                                            />
                                            <label className={labelClassName}>
                                                {field.required && (
                                                    <span style={{ color: "red" }}>*</span>
                                                )}{" "}
                                                {field.label}
                                            </label>
                                        </span>
                                    );
                                }}
                            />

                            {error && <div className="p-error">{error.message}</div>}
                        </div>
                    );
                case "year":
                    const currentYear = moment().year();
                    const years = useMemo(
                        () =>
                            Array.from(new Array(11), (_, index) => ({
                                label: currentYear - index,
                                value: currentYear - index,
                            })),
                        [currentYear]
                    );
                    return (
                        <div
                            key={`${field.key}-${index}`}
                            className={`mt-3 ${field.className ? field.className : "col-12 sm:col-6 md:col-3"
                                }`}
                        >
                            <Controller
                                name={field.name}
                                control={control}
                                rules={field.validation}
                                render={({ field: controllerField }) => (
                                    <span className="p-float-label">
                                        <Dropdown
                                            {...propsSelect}
                                            {...field.props}
                                            {...controllerField}
                                            value={currentYear}
                                            options={years}
                                            className={className}
                                            disabled={field.disabled}
                                            ref={handleFocus}
                                        />
                                        <label className={labelClassName}>
                                            {field.required && (
                                                <span style={{ color: "red" }}>*</span>
                                            )}{" "}
                                            {field.label}
                                        </label>
                                    </span>
                                )}
                            />
                            {error && <div className="p-error">{error.message}</div>}
                        </div>
                    );
                case "textarea":
                    return (
                        <div
                            key={`${field.key}-${index}`}
                            className={`mt-3 ${field.className ? field.className : "col-12 mt-3"}`}
                        >
                            <Controller
                                name={field.name}
                                control={control}
                                rules={field.validation}
                                render={({ field: controllerField }) => (
                                    <span className="p-float-label">
                                        <InputTextarea
                                            {...controllerField}
                                            value={controllerField.value ?? ""}
                                            rows={2}
                                            cols={30}
                                            className={className}
                                            disabled={field.disabled}
                                            autoComplete="off"
                                            autoResize
                                        />
                                        <label className={labelClassName}>
                                            {field.required && (
                                                <span style={{ color: "red" }}>*</span>
                                            )}{" "}
                                            {field.label}
                                        </label>
                                    </span>
                                )}
                            />
                            {error && <div className="p-error">{error.message}</div>}
                        </div>
                    );
                case "dropdown":
                    return (
                        <div
                            key={`${field.key}-${index}`}
                            className={`mt-3 ${field.className ? field.className : "col-12 sm:col-6 md:col-3"
                                }`}
                        >
                            <Controller
                                name={field.name}
                                control={control}
                                rules={field.validation}
                                render={({ field: controllerField }) => (
                                    <span className="p-float-label">
                                        <Dropdown
                                            {...controllerField}
                                            {...propsSelect}
                                            {...field.props}
                                            value={controllerField.value ?? ""}
                                            options={field.options}
                                            className={className}
                                            disabled={field.disabled}
                                            ref={handleFocus}
                                        />
                                        <label className={labelClassName}>
                                            {field.required && (
                                                <span style={{ color: "red" }}>*</span>
                                            )}{" "}
                                            {field.label}
                                        </label>
                                    </span>
                                )}
                            />
                            {error && <div className="p-error">{error.message}</div>}
                        </div>
                    );
                case "selector":
                    const SelectorComponent = field.component;
                    return (
                        <div
                            key={`${field.key}-${index}`}
                            className={`mt-3 ${field.className ? field.className : "col-12 sm:col-6 md:col-3"
                                }`}
                            style={{ width: "100%" }}
                        >
                            <label
                                htmlFor={field.name}
                                className={classNames("block mb-1 font-medium", {
                                    "p-error": errors[field.name],
                                })}
                            >
                                {field.required && <span style={{ color: "red" }}>*</span>}{" "}
                                {field.label}
                            </label>

                            <SelectorComponent
                                name={field.name}
                                items={field.options}
                                titulo={field.titulo}
                                label={field.label}
                                multiSelect={field.multiSelect}
                                rules={field.validation}
                                renderItem={field.renderItem}
                                renderValue={field.renderValue}
                                renderActions={field.renderActions}
                                onCreateNew={field.onCreateNew}
                                filterBy={field.filterBy}
                                disabled={field.disabled}
                                showClear={field.showClear}
                            />

                            {errors[field.name] && (
                                <small className="p-error block mt-1">
                                    {errors[field.name]?.message}
                                </small>
                            )}
                        </div>
                    );

                case "treeSelect":
                    return (
                        <div
                            key={`${field.key}-${index}`}
                            className={`mt-3 ${field.className ? field.className : "col-12 sm:col-6 md:col-3"
                                }`}
                        >
                            <Controller
                                name={field.name}
                                control={control}
                                rules={field.validation}
                                render={({ field: controllerField }) => (
                                    <span className="p-float-label">
                                        <TreeSelect
                                            {...controllerField}
                                            {...field.props}
                                            value={
                                                controllerField.value ||
                                                (field.multiple ? [] : null)
                                            }
                                            filter
                                            filterBy={"label"}
                                            options={field.options}
                                            className={className}
                                            disabled={field.disabled}
                                            onChange={(e) => controllerField.onChange(e.value)}
                                            selectionMode={
                                                field.props?.selectionMode
                                                    ? field.props.selectionMode
                                                    : field.multiple
                                                        ? "multiple"
                                                        : "single"
                                            }
                                            metaKeySelection={false}
                                        />
                                        <label className={labelClassName}>
                                            {field.required && (
                                                <span style={{ color: "red" }}>*</span>
                                            )}{" "}
                                            {field.label}
                                        </label>
                                    </span>
                                )}
                            />
                            {error && <div className="p-error">{error.message}</div>}
                        </div>
                    );

                case "upload":
                    return (
                        <div
                            key={`${field.key}-${index}`}
                            className={`mt-3 ${field.className ? field.className : "col-12 sm:col-6 md:col-3"
                                }`}
                        >
                            <Controller
                                name={field.name}
                                control={control}
                                render={() => (
                                    <div>
                                        <UploadButton
                                            label={watch(field.name)?.name || field.label}
                                            onChange={({ target }) =>
                                                setValue(field.name, target.files[0])
                                            }
                                            className={className}
                                            disabled={field.disabled}
                                        />
                                    </div>
                                )}
                            />
                        </div>
                    );
                case "selectButton":
                    return (
                        <div
                            key={`${field.key}-${index}`}
                            className={`mt-3 ${field.className ? field.className : "col-12 sm:col-6 md:col-3"
                                }`}
                        >
                            <Controller
                                name={field.name}
                                control={control}
                                render={({ field: controllerField }) => (
                                    <div className="p-inputgroup">
                                        <span
                                            className="p-inputgroup-addon pl-1 pr-1 flex justify-content-start align-items-center"
                                            style={
                                                field.styleLabel
                                                    ? field.styleLabel
                                                    : { width: "100%" }
                                            }
                                        >
                                            {field.required && (
                                                <span style={{ color: "red" }}>*</span>
                                            )}{" "}
                                            {field.label}
                                        </span>
                                        <SelectButton
                                            {...propsSelectButton}
                                            {...controllerField}
                                            {...field.props}
                                            value={controllerField.value ?? ""}
                                            options={field.options}
                                            className={className}
                                            disabled={field.disabled}
                                        />
                                    </div>
                                )}
                            />
                        </div>
                    );
                case "custom":
                    const CustomComponent = field.component;
                    return (
                        <div
                            key={`${field.key}-${index}`}
                            className={`mt-3 ${field.className ? field.className : "col-12 sm:col-6 md:col-3"
                                }`}
                        >
                            <Controller
                                name={field.name}
                                control={control}
                                rules={field.validation}
                                render={({ field: controllerField }) => (
                                    <span className="p-float-label">
                                        <CustomComponent
                                            {...controllerField}
                                            {...field.props}
                                            className={className}
                                            disabled={field.disabled}
                                            ref={handleFocus}
                                        />
                                        <label className={labelClassName}>
                                            {field.required && (
                                                <span style={{ color: "red" }}>*</span>
                                            )}{" "}
                                            {field.label}
                                        </label>
                                    </span>
                                )}
                            />
                        </div>
                    );

                case "checkGroup":
                    return (
                        <div
                            key={`${field.key}-${index}`}
                            className={`mt-3 ${field.className ? field.className : "col-12 sm:col-6 md:col-3"
                                }`}
                        >
                            <Controller
                                name={field.name}
                                control={control}
                                rules={field.validation}
                                render={({ field: controllerField }) => (
                                    <div className="p-inputgroup">
                                        <span className="p-float-label">
                                            <span className="p-inputgroup-addon">
                                                <Checkbox
                                                    value={controllerField.value ?? ""}
                                                    disabled={field.disabled}
                                                    checked={watch(field.valCheck)}
                                                    onChange={(e) =>
                                                        setValue(field.valCheck, e.checked)
                                                    }
                                                />
                                            </span>
                                            {(() => {
                                                switch (field.subType) {
                                                    case "text":
                                                        return (
                                                            <InputText
                                                                {...controllerField}
                                                                {...field.props}
                                                                value={controllerField.value ?? ""}
                                                                className={className}
                                                                disabled={field.disabled}
                                                                keyfilter={
                                                                    field.keyfilter
                                                                        ? field.keyfilter
                                                                        : ""
                                                                }
                                                                maxLength={
                                                                    field.maxLength
                                                                        ? field.maxLength
                                                                        : 50
                                                                }
                                                                autoComplete="off"
                                                            />
                                                        );
                                                    case "dropdown":
                                                        return (
                                                            <Dropdown
                                                                {...propsSelect}
                                                                {...controllerField}
                                                                value={controllerField.value ?? ""}
                                                                options={field.options}
                                                                className={className}
                                                                disabled={field.disabled}
                                                                ref={handleFocus}
                                                            />
                                                        );
                                                    case "multiselect":
                                                        return (
                                                            <MultiSelect
                                                                {...propsSelect}
                                                                {...field.props}
                                                                {...controllerField}
                                                                value={controllerField.value || []}
                                                                options={field.options}
                                                                className={className}
                                                                disabled={field.disabled}
                                                                onChange={(e) =>
                                                                    controllerField.onChange(
                                                                        e.value
                                                                    )
                                                                }
                                                                maxSelectedLabels={3}
                                                            />
                                                        );
                                                    case "calendar":
                                                        return (
                                                            <Calendar
                                                                {...propsCalendar}
                                                                {...controllerField}
                                                                {...field.props}
                                                                value={controllerField.value ?? ""}
                                                                className={className}
                                                                disabled={field.disabled}
                                                                ref={handleFocus}
                                                            />
                                                        );
                                                    case "textarea":
                                                        return (
                                                            <InputTextarea
                                                                {...controllerField}
                                                                value={controllerField.value ?? ""}
                                                                autoResize
                                                                rows={1}
                                                                cols={30}
                                                                className={className}
                                                                disabled={field.disabled}
                                                            />
                                                        );
                                                    case "selectButton":
                                                        return (
                                                            <div className="p-inputgroup">
                                                                <span className="p-inputgroup-addon pl-1 pr-1">
                                                                    {field.label}
                                                                </span>
                                                                <SelectButton
                                                                    {...propsSelectButton}
                                                                    {...controllerField}
                                                                    {...field.props}
                                                                    value={
                                                                        controllerField.value ?? ""
                                                                    }
                                                                    options={field.options}
                                                                    className={className}
                                                                    disabled={field.disabled}
                                                                />
                                                            </div>
                                                        );
                                                    case "custom":
                                                        const CustomComponent = field.component;
                                                        return (
                                                            <CustomComponent
                                                                {...controllerField}
                                                                {...field.props}
                                                                className={className}
                                                                disabled={field.disabled}
                                                                ref={handleFocus}
                                                            />
                                                        );
                                                    default:
                                                        return null;
                                                }
                                            })()}
                                            {field.subType !== "selectButton" && (
                                                <label
                                                    htmlFor={field.name}
                                                    className={`${labelClassName} ml-6`}
                                                >
                                                    {field.label}{" "}
                                                    {field.required && (
                                                        <span style={{ color: "red" }}>*</span>
                                                    )}
                                                </label>
                                            )}
                                        </span>
                                    </div>
                                )}
                            />
                            {error && <div className="p-error">{error.message}</div>}
                        </div>
                    );

                case "inputSwitch":
                    return (
                        <div
                            key={`${field.key}-${index}`}
                            className={`mt-3 ${field.className ? field.className : "col-12 sm:col-6 md:col-3"
                                }`}
                            style={{ display: "flex", alignItems: "center" }} // Ajustado
                        >
                            <Controller
                                name={field.name}
                                control={control}
                                render={({ field: controllerField }) => (
                                    <div
                                        className="p-field-checkbox"
                                        style={{ display: "flex", alignItems: "center" }}
                                    >
                                        <InputSwitch
                                            ref={handleFocus}
                                            {...controllerField}
                                            checked={controllerField.value}
                                            className={className}
                                            disabled={field.disabled}
                                            onChange={(e) => controllerField.onChange(e.value)}
                                        />
                                        <label
                                            htmlFor={field.name}
                                            className={`${labelClassName} ml-2`}
                                            style={{ marginBottom: 0 }} // Ajustado
                                        >
                                            {field.label}{" "}
                                            {field.required && (
                                                <span style={{ color: "red" }}>*</span>
                                            )}
                                        </label>
                                    </div>
                                )}
                            />
                            {error && <div className="p-error">{error.message}</div>}
                        </div>
                    );
                case "password":
                    return (
                        <div
                            key={`${field.key}-${index}`}
                            className={`mt-3 ${field.className ? field.className : "col-12 sm:col-6 md:col-3"
                                }`}
                        >
                            <Controller
                                name={field.name}
                                control={control}
                                rules={field.validation}
                                render={({ field: controllerField }) => (
                                    <span className="p-float-label">
                                        <Password
                                            {...controllerField}
                                            {...field.props}
                                            value={controllerField.value ?? ""}
                                            className={className}
                                            disabled={field.disabled}
                                            header={HeaderPassword}
                                            footer={FooterPassword}
                                            feedback={field.feedback ?? true}
                                            ref={handleFocus}
                                            toggleMask={true}
                                        />
                                        <label className={labelClassName}>
                                            {field.required && (
                                                <span style={{ color: "red" }}>*</span>
                                            )}{" "}
                                            {field.label}
                                        </label>
                                    </span>
                                )}
                            />
                            {error && <div className="p-error">{error.message}</div>}
                        </div>
                    );
                case "currency":
                    return (
                        <div
                            key={`${field.key}-${index}`}
                            className={`mt-3 ${field.className ? field.className : "col-12 sm:col-6 md:col-3"
                                }`}
                        >
                            <Controller
                                name={field.name}
                                control={control}
                                rules={field.validation}
                                render={({ field: controllerField }) => (
                                    <span className="p-float-label">
                                        <CurrencyInput
                                            {...propsCurrencyInput}
                                            {...controllerField}
                                            {...field.props}
                                            onChange={() => null}
                                            value={controllerField.value}
                                            className={`p-inputtext p-component text-right ${className}`}
                                            onValueChange={(v) => controllerField.onChange(v)}
                                        />
                                        <label className={labelClassName}>
                                            {field.required && (
                                                <span style={{ color: "red" }}>*</span>
                                            )}{" "}
                                            {field.label}
                                        </label>
                                    </span>
                                )}
                            />
                            {error && <div className="p-error">{error.message}</div>}
                        </div>
                    );
                default:
                    return null;
            }
        },
        [control, errors, watch, setValue]
    );

    return (
        <div className="grid p-fluid">
            {fields.map((field, index) => renderField(field, index))}
        </div>
    );
});

export default GenericFormSection;
