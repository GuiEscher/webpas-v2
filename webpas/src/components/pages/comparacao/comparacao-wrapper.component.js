import React from "react";
import useAuth from "../../../services/useAuth";
import { styled } from "@mui/material/styles";
import Navbar from "../../re-usable/navbar.component";
import { Container } from "@mui/material";
import { Box } from "@mui/system";
import Comparacao from "./comparacao.component";

const DrawerHeader = styled("div")(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",
  padding: theme.spacing(0, 1),
  ...theme.mixins.toolbar,
}));

const containerStyle = {
  "@media (min-width: 1400px)": {
    maxWidth: "1400px",
  },
};

const ComparacaoWrapper = (props) => {
  const { user, logout } = useAuth();
  const { nav, setNav } = props;

  return (
    <>
      <Navbar open={nav} setOpen={setNav} />
      <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
        <DrawerHeader />
        <Container sx={containerStyle}>
          <Comparacao user={user} logout={logout} />
        </Container>
      </Box>
    </>
  );
};

export default ComparacaoWrapper;
