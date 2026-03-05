import { Subject } from "rxjs";

const notificationSubject = new Subject();
const attachedSubject = new Subject();

export const updateCountAttachedView = {
    setCountAttached: (payload) => attachedSubject.next(payload),
    getCountAttached: () => attachedSubject.asObservable(),
};

export const updateNotificationView = {
    setNotification: (tipo) => notificationSubject.next(tipo),
    getNotification: () => notificationSubject.asObservable(),
};
