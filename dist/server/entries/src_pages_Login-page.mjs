import { jsx, jsxs } from "react/jsx-runtime";
import { useContext, createContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast, Center, Box, VStack, Heading, Text, Alert, AlertIcon, FormControl, FormLabel, Input, Button } from "@chakra-ui/react";
const AuthContext = createContext(null);
const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};
function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const handleSubmit = async (e) => {
    var _a, _b, _c;
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await login(email, password);
      toast({
        title: "ເຂົ້າສູ່ລະບົບສຳເລັດ",
        status: "success",
        duration: 2e3,
        isClosable: true
      });
      if ((res == null ? void 0 : res.role) === "admin" || (res == null ? void 0 : res.role) === "master") {
        navigate("/dashboard");
      } else {
        navigate("/opo");
      }
    } catch (err) {
      const description = ((_b = (_a = err == null ? void 0 : err.response) == null ? void 0 : _a.data) == null ? void 0 : _b.message) || (err == null ? void 0 : err.message) || "something with wrong";
      if (((_c = err.response) == null ? void 0 : _c.status) === 429) {
        toast({
          title: "ເກີດຂໍ້ຜິດພາດ",
          description,
          status: "error",
          duration: 3e3,
          isClosable: true
        });
      } else {
        toast({
          title: "ເກີດຂໍ້ຜິດພາດ",
          description,
          status: "error",
          duration: 3e3,
          isClosable: true
        });
      }
      setError(description);
    } finally {
      setLoading(false);
    }
  };
  return /* @__PURE__ */ jsx(Center, { minH: "100vh", bgGradient: "linear(to-br, gray.900, gray.800)", children: /* @__PURE__ */ jsx(
    Box,
    {
      w: "full",
      maxW: "md",
      p: 8,
      bg: "gray.700",
      borderRadius: "lg",
      boxShadow: "xl",
      border: "1px",
      borderColor: "gray.600",
      children: /* @__PURE__ */ jsxs(VStack, { spacing: 6, align: "stretch", children: [
        /* @__PURE__ */ jsxs(Box, { textAlign: "center", children: [
          /* @__PURE__ */ jsx(
            Heading,
            {
              fontFamily: "Noto Sans Lao, sans-serif",
              size: "lg",
              color: "white",
              mb: 2,
              children: "ລະບົບຈັດການການເງິນ"
            }
          ),
          /* @__PURE__ */ jsx(Text, { fontFamily: "Noto Sans Lao, sans-serif", color: "gray.300", children: "ເຂົ້າສູ່ລະບົບ" }),
          /* @__PURE__ */ jsxs(Text, { fontFamily: "Noto Sans Lao, sans-serif", color: "gray.300", children: [
            "ກະລຸນາຢ່າເຂົ້າລະບົບເກີນ 5 ຄັ້ງ",
            " "
          ] })
        ] }),
        error && /* @__PURE__ */ jsxs(
          Alert,
          {
            fontFamily: "Noto Sans Lao, sans-serif",
            status: "error",
            borderRadius: "md",
            children: [
              /* @__PURE__ */ jsx(AlertIcon, {}),
              error
            ]
          }
        ),
        /* @__PURE__ */ jsx("form", { onSubmit: handleSubmit, children: /* @__PURE__ */ jsxs(VStack, { spacing: 4, children: [
          /* @__PURE__ */ jsxs(FormControl, { children: [
            /* @__PURE__ */ jsx(
              FormLabel,
              {
                fontFamily: "Noto Sans Lao, sans-serif",
                color: "gray.300",
                children: "ອິເມວ"
              }
            ),
            /* @__PURE__ */ jsx(
              Input,
              {
                type: "email",
                value: email,
                onChange: (e) => setEmail(e.target.value),
                placeholder: "your@email.com",
                bg: "gray.600",
                color: "white",
                _placeholder: { color: "gray.400" },
                borderColor: "gray.500",
                focusBorderColor: "green.400",
                required: true
              }
            )
          ] }),
          /* @__PURE__ */ jsxs(FormControl, { children: [
            /* @__PURE__ */ jsx(
              FormLabel,
              {
                fontFamily: "Noto Sans Lao, sans-serif",
                color: "gray.300",
                children: "ລະຫັດຜ່ານ"
              }
            ),
            /* @__PURE__ */ jsx(
              Input,
              {
                type: "password",
                value: password,
                onChange: (e) => setPassword(e.target.value),
                placeholder: "••••••••",
                bg: "gray.600",
                color: "white",
                _placeholder: { color: "gray.400" },
                borderColor: "gray.500",
                focusBorderColor: "green.400",
                required: true
              }
            )
          ] }),
          /* @__PURE__ */ jsx(
            Button,
            {
              fontFamily: "Noto Sans Lao, sans-serif",
              type: "submit",
              w: "full",
              bg: "green.500",
              color: "white",
              _hover: { bg: "green.600" },
              _disabled: { bg: "gray.500" },
              isLoading: loading,
              loadingText: "ກຳລັງເຂົ້າສູ່ລະບົບ...",
              children: "ເຂົ້າສູ່ລະບົບ"
            }
          )
        ] }) })
      ] })
    }
  ) });
}
export {
  Login as default
};
