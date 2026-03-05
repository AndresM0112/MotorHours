import { useCallback, useRef } from "react";

export function useExcelNav({ rowCount, colOrder, loopRows = false, loopCols = false }) {
    const cellRefs = useRef(new Map()); // key: `${row}__${colKey}` -> HTMLElement

    const key = (r, cKey) => `${r}__${cKey}`;

    const register = useCallback((rowIndex, columnKey, el) => {
        const k = key(rowIndex, columnKey);
        if (el) cellRefs.current.set(k, el);
        else cellRefs.current.delete(k);
    }, []);

    const focusCell = useCallback((rowIndex, columnKey) => {
        const el = cellRefs.current.get(key(rowIndex, columnKey));
        if (!el) return;
        const target = el.querySelector("input, [tabindex]") || el;
        if (target && target.focus) target.focus();
        if (target && target.select) {
            try {
                target.select();
            } catch {}
        }
    }, []);

    const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

    const nextRow = (r, delta) => {
        const n = r + delta;
        if (n < 0) return loopRows ? rowCount - 1 : 0;
        if (n >= rowCount) return loopRows ? 0 : rowCount - 1;
        return n;
    };

    const nextCol = (cKey, delta) => {
        const i = colOrder.indexOf(cKey);
        if (i === -1) return cKey;
        let j = i + delta;
        if (j < 0) j = loopCols ? colOrder.length - 1 : 0;
        if (j >= colOrder.length) j = loopCols ? 0 : colOrder.length - 1;
        return colOrder[j];
    };

    const onKeyDown = useCallback(
        (e, ctx) => {
            const { rowIndex, columnKey } = ctx;
            const goto = (r, c) => {
                e.preventDefault();
                e.stopPropagation();
                focusCell(r, c);
            };
            const mod = { ctrl: e.ctrlKey || e.metaKey, shift: e.shiftKey };

            switch (e.key) {
                case "ArrowDown":
                    return goto(nextRow(rowIndex, +1), columnKey);
                case "ArrowUp":
                    return goto(nextRow(rowIndex, -1), columnKey);
                case "ArrowRight":
                    return goto(rowIndex, nextCol(columnKey, +1));
                case "ArrowLeft":
                    return goto(rowIndex, nextCol(columnKey, -1));
                case "Enter":
                    return goto(nextRow(rowIndex, mod.shift ? -1 : +1), columnKey);
                case "Tab":
                    return goto(rowIndex, nextCol(columnKey, mod.shift ? -1 : +1));
                case "Home":
                    if (mod.ctrl) return goto(0, colOrder[0]);
                    return goto(rowIndex, colOrder[0]);
                case "End":
                    if (mod.ctrl) return goto(rowCount - 1, colOrder[colOrder.length - 1]);
                    return goto(rowIndex, colOrder[colOrder.length - 1]);
                case "PageDown":
                    return goto(clamp(rowIndex + 20, 0, rowCount - 1), columnKey);
                case "PageUp":
                    return goto(clamp(rowIndex - 20, 0, rowCount - 1), columnKey);
                default:
                    return;
            }
        },
        [colOrder, rowCount, loopRows, loopCols, focusCell]
    );

    const cellProps = useCallback(
        (rowIndex, columnKey) => ({
            tabIndex: -1,
            "data-colkey": columnKey,
            "data-rowindex": rowIndex,
            ref: (el) => register(rowIndex, columnKey, el),
            onKeyDown: (e) => onKeyDown(e, { rowIndex, columnKey }),
        }),
        [onKeyDown, register]
    );

    return { cellProps, onKeyDown, focusCell };
}
