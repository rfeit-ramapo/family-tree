/**
 * Axios instance for making requests to the server
 */

import axios from "axios";

const baseURL = __API_PATH__;
const axiosInstance = axios.create({
  baseURL,
});

export default axiosInstance;
