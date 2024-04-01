import axios from "axios";

async function fetchData(targetPool: string) {
    const url = `http://localhost:8080/getActivePool?id=${targetPool}`;
    const response = await axios.get(url);
    return response.data;
}

export async function main(targetPool: string) {
    const data = await fetchData(targetPool);
    console.log(data);
}

main("AW83cW8FktqWDyRpijQ15tMo8wREExBBgzGGJtgHyDmC");