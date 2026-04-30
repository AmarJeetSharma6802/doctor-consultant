import axiosInstance from "../api/axiosInstance";

export const appointmentService = {
  bookAppointment: async (appointmentData: any) => {
    const response = await axiosInstance.post("/book-appointment", appointmentData);
    return response.data;
  },

  getMyAppointments: async () => {
    const response = await axiosInstance.get("/my-appointments");
    return response.data;
  },

  cancelAppointment: async (id: string) => {
    const response = await axiosInstance.patch(`/appointments/${id}/cancel`);
    return response.data;
  },
};
