import { Subject } from "rxjs";

const ticketSubject = new Subject();

export const ticketEvents = {
    emit: (action = "refresh") => ticketSubject.next(action),
    on: () => ticketSubject.asObservable(),
};
