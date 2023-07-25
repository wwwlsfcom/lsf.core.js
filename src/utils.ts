export async function httpGet(url): Promise<Response> {
    return fetch(url, {method: "GET"});
}


export async function httpPost(url, data): Promise<Response> {
    const blob = new Blob([JSON.stringify(data)], {type: 'application/json'})
    return fetch(url, {method: "POST", body: blob});
}

export async function httpPostFormData(url, formData): Promise<Response> {
    return fetch(url, {method: "POST", body: formData});
}

export function getExtension(fileName:string): string {
    const array = /.+\.([^\.]+)$/.exec(fileName);
    return array.length > 1 && array[1];
}


/**
 * 判断一个对象的类型
 */
export function t<T>(obj): T {
    return obj as unknown as T;
}


// 通过map的value找key(ps:obj是js中的map对象 value就是map中的value）
export function findKey(obj, value, compare = (a, b) => a === b) {
    return Object.keys(obj).find(k => compare(obj[k], value))
}


/**
 * 比较两个集合, 返回两个几何中不相同的元素
 * @param set1
 * @param set2
 * @return : part1: 在set1中,但不在set2中, part2: 在set2中, 但不在set1中
 */
export function identicalSet(set1, set2): { part1: Set<any>, part2: Set<any> } {
    const part1 = new Set([...set1]);
    const part2 = new Set([...set2]);

    set1.forEach(v => {
        part2.delete(v);
    });
    set2.forEach(v => {
        part1.delete(v);
    });

    return {part1, part2};
}
