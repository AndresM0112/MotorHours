// import socket from "./socketClient";
// import { useGlobalStore } from "../store/globalStore";

// function subscribeToEntity(entity, storeKey) {
//     socket.on(`${entity}:list`, (data) => {
//         useGlobalStore.setState({ [storeKey]: data });
//     });

//     socket.on(`${entity}:created`, (item) => {
//         useGlobalStore.setState((state) => ({
//             [storeKey]: [...(state[storeKey] || []), item],
//         }));
//     });

//     socket.on(`${entity}:updated`, (item) => {
//         useGlobalStore.setState((state) => ({
//             [storeKey]: (state[storeKey] || []).map((i) => (i?.id === item?.id ? item : i)),
//         }));
//     });

//     socket.on(`${entity}:deleted`, (id) => {
//         useGlobalStore.setState((state) => ({
//             [storeKey]: (state[storeKey] || []).filter((i) => i?.id !== id),
//         }));
//     });
// }

// export const initGlobalSocket = () => {
//     subscribeToEntity("users", "users");
//     subscribeToEntity("roles", "roles");
//     subscribeToEntity("projects", "projects");
//     subscribeToEntity("tasks", "tasks");
//     subscribeToEntity("status", "status");
//     subscribeToEntity("authTypes", "authTypes");
//     subscribeToEntity("docTypes", "docTypes");
//     subscribeToEntity("countries", "countries");
//     subscribeToEntity("cities", "cities");
//     subscribeToEntity("permissions", "permissions");
//     subscribeToEntity("pages", "pages");
//     subscribeToEntity("priorityLevels", "priorityLevels");
//     subscribeToEntity("tags", "tags");
//     subscribeToEntity("customFields", "customFields");
//     subscribeToEntity("promptTemplates", "promptTemplates");
// };
