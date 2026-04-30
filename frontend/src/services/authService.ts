import axiosInstance from "../api/axiosInstance";

export const authService = {
  login: async (credentials: any) => {
    const response = await axiosInstance.post("/auth", {
      ...credentials,
      action: "login",
    });
    return response.data;
  },

  register: async (userData: any) => {
    const response = await axiosInstance.post("/auth", {
      ...userData,
      action: "register",
    });
    return response.data;
  },

  verifyOtp: async (otpData: any) => {
    const response = await axiosInstance.post("/auth", {
      ...otpData,
      action: "verify_otp",
    });
    return response.data;
  },

  getProfile: async () => {
    const response = await axiosInstance.get("/me");
    return response.data;
  },

  logout: async () => {
    // If backend has a logout route, call it. 
    // Otherwise, clear local state.
  },
};
