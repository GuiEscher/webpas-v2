import React, {useEffect,useState} from "react";
import useAuth from "../../../services/useAuth";
import ConfigsDataService from '../../../services/configs';
import { styled } from '@mui/material/styles';
import Navbar from "../../re-usable/navbar.component";
import { Container } from "@mui/material";
import { Box } from "@mui/system";
import ConfigForm from "./config-form.component";

const DrawerHeader = styled('div')(({ theme }) => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    padding: theme.spacing(0, 1),
    // necessary for content to be below app bar
    ...theme.mixins.toolbar,
  }));
  
  const containerStyle = {
    '@media (min-width: 1400px)': {
      maxWidth: '1400px'
    }
  }

const ConfigWrapper = props =>{
    const {user,logout} = useAuth()
    const [config,setConfig] = useState({dias:[],periodos:[]})
    const [noUser,setNoUser] = useState(true)
    const {nav,setNav} = props
  
    useEffect(()=>{
      if(user && noUser){
        retornaConfig()
        setNoUser(false)
      }
    },[user])

    const retornaConfig = () =>{
        let searchId = user? user._id : "10"
        ConfigsDataService.getConfigById(user._id) 
            .then(res=> {
              console.log(res.data)
              setConfig(res.data)})
            .catch(err=>{
              console.log(err.response.data)
              let notAuthorized = err.response.data?.notAuth ? err.response.data.notAuth : false
              if (notAuthorized){
                logout()
              } 
            })
    }

    return(
        <>
          <Navbar open={nav} setOpen={setNav}/>
          <Box component="main" sx={{ flexGrow: 1, p: 3}}>
              <DrawerHeader />
              <Container sx={containerStyle}>
                <ConfigForm config={config} user={user} logout={logout} />
              </Container>
            </Box>
        </>
    )
}

export default ConfigWrapper