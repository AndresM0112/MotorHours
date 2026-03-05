import Axios from "axios";
import { headers } from "./converAndConst";
import Cookies from "js-cookie";

export const findNodePath = (nodes, targetValue, currentPath = []) => {
    for (const node of nodes) {
        const newPath = [...currentPath, node.key];

        if (node.key === targetValue) {
            return newPath;
        }

        if (node.children) {
            const childPath = findNodePath(node.children, targetValue, newPath);

            if (childPath) {
                return childPath;
            }
        }
    }
    return null;
};

export const findNode = (nodes, nodeValue) => {
    for (let node of nodes) {
        if (node.key === nodeValue) {
            return node;
        }

        if (node?.children && node.children.length && node.children[0]?.key !== 0) {
            const foundNode = findNode(node.children, nodeValue);
            if (foundNode) {
                return foundNode;
            }
        }
    }
    return null;
};

export const setNodePath = async (sitio, biblioteca, path) => {
    return new Promise(async (resolve, reject) => {
        const arryPath = path.split("/");
        arryPath.unshift("");
        let tree = [];

        for (let folder of arryPath) {
            const params = { sitio, biblioteca, carpeta: folder };

            try {
                const { data } = await Axios.get("api/microsoft-graph/get_folders_drive", {
                    params,
                    headers: {
                        ...headers,
                        Authorization: `Bearer ${Cookies.get("tokenMOTORHOURS")}`,
                    },
                });

                if (folder === "") {
                    tree = data;
                } else {
                    const newTree = findNode(tree, folder);
                    newTree.children = data;
                    newTree.expanded = true;
                }
            } catch (error) {
                if (error.response) {
                    if (error.response.status === 404) return reject("Api no encontrada");
                    return reject(error.response?.data.message);
                }
                reject(error);
            }
        }

        resolve(tree);
    });
};
