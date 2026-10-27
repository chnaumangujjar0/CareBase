import type { ThemeConfig } from "antd";

const sharedTokens = {
  colorPrimary: "#0F766E",
  colorInfo: "#0284C7",
  colorSuccess: "#16A34A",
  colorWarning: "#D97706",
  colorError: "#DC2626",
  colorTextBase: "#1E293B",
  colorBgLayout: "#F1F5F9",
  colorBgContainer: "#FFFFFF",
  colorBorder: "#E2E8F0",
  borderRadius: 8,
  fontFamily: '"Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  boxShadowTertiary: "0 1px 3px rgba(15, 23, 42, 0.08), 0 1px 2px rgba(15, 23, 42, 0.06)",
};

export const appTheme: ThemeConfig = {
  token: sharedTokens,
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

export const facilityTheme = {
  token: {
    ...sharedTokens,
    borderRadius: 12,
    controlHeightLG: 48,
  },
  components: {
    Card: { borderRadiusLG: 16 },
    Table: {
      headerBg: "#F1F5F9",
      headerColor: "#475569",
      rowHoverBg: "#F8FAFC",
      borderRadiusLG: 12,
    },
  },
};
