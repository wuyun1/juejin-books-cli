import { resolve } from "path";



export const delay = (timeout: number = 0, ret: any = null): Promise<void> => {
    return new Promise((resolve) => {
        setTimeout(() => resolve(ret), timeout);
    });
}