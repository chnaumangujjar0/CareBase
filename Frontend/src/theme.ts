import type { ThemeConfig } from "antd";

export const appTheme: ThemeConfig = {
  token: {
    colorPrimary: "#0F766E",
    colorInfo: "#0284C7",
    colorSuccess: "#16A34A",
    colorWarning: "#D97706",
    colorError: "#DC2626",
    colorTextBase: "#1E293B",
    colorBgLayout: "#F1F5F9",
    colorBgContainer: "#FFFFFF",
    borderRadius: 8,
    fontFamily: '"Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  components: {
    Layout: {
      bodyBg: "#F1F5F9",
      headerBg: "#FFFFFF",
      siderBg: "#FFFFFF",
    },
    Card: {
      borderRadiusLG: 12,
    },
    Button: {
      controlHeight: 40,
    },
    Input: {
      controlHeight: 40,
    },
    Select: {
      controlHeight: 40,
    },
    Table: {
      headerBg: "#F8FAFC",
    },
  },
};
