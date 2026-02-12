import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Center, Spinner } from "@chakra-ui/react";

export default function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  console.log(user)
  if (loading) {
    return (
      <Center h="100vh">
        <Spinner size="xl" color="green.400" />
      </Center>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
