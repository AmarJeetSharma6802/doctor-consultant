import axiosInstance from "../api/axiosInstance";

export const doctorService = {
  getDoctors: async () => {
    const response = await axiosInstance.get("/doctors");
    return response.data;
  },

  getAvailableSlots: async (doctorId: string) => {
    const response = await axiosInstance.get(`/doctors/${doctorId}/slots`);
    return response.data;
  },
};
