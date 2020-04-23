import React from "react";
import { makeStyles, withStyles } from "@material-ui/core/styles";
import AppBar from "@material-ui/core/AppBar";
import Toolbar from "@material-ui/core/Toolbar";
import Typography from "@material-ui/core/Typography";
import IconButton from "@material-ui/core/IconButton";
import MenuIcon from "@material-ui/icons/Menu";
import Container from "@material-ui/core/Container";
import Tabs from "@material-ui/core/Tabs";
import Tab from "@material-ui/core/Tab";
import Box from "@material-ui/core/Box";

import Inputs from "./Inputs";
import Graphs from "./Graphs";
import AmortizationTable from "./AmortizationTable";

const useStyles = makeStyles(theme => ({
  root: {
    flexGrow: 1,
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    overflow: "hidden",
  },
  menuButton: {
    marginRight: theme.spacing(2),
  },
  title: {
    flexGrow: 1,
  },
  container: {
    display: "flex",
    backgroundColor: theme.palette.background.paper,
    height: "100%",
    padding: 0,
  },
  panel: {
    backgroundColor: "#D3D3D3",
    width: "100%",
  },
}));

const TabPanel = props => {
  const { children, value, index, ...other } = props;

  return (
    <Typography
      component="div"
      role="tabpanel"
      style={{ overflowY: "scroll", height: "91vh" }}
      hidden={value !== index}
      id={`vertical-tabpanel-${index}`}
      aria-labelledby={`vertical-tab-${index}`}
      {...other}>
      {value === index && <Box p={3}>{children}</Box>}
    </Typography>
  );
};

const StyledAppBar = withStyles({
  root: {
    background: "#607d8b",
  },
})(AppBar);

const defaultInputs = {
  appraisal: null,
  originalPrincipal: null,
  originalRate: null,
  originalTerm: null,
  originalPMI: null,
  currentPayment: null,
  currentBalance: null,
  closingCosts: null,
  newRate: null,
  newTerm: null,
  newPMI: null,
  cashOut: null,
};

const App = () => {
  const classes = useStyles();
  const [value, setValue] = React.useState(0);

  const [inputs, setInputs] = React.useState(defaultInputs);
  const onInputChange = field => e => {
    setInputs({
      ...inputs,
      [field]: e.target.value,
    });
  };

  const handleChange = (_event, newValue) => {
    setValue(newValue);
  };

  return (
    <div className={classes.root}>
      <StyledAppBar position="static">
        <Toolbar>
          <IconButton
            edge="start"
            className={classes.menuButton}
            color="inherit"
            aria-label="menu">
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" className={classes.title}>
            Mortgage Refi Calculator
          </Typography>
        </Toolbar>
      </StyledAppBar>
      <Container maxWidth={false} className={classes.container}>
        <Tabs
          orientation="vertical"
          variant="scrollable"
          value={value}
          onChange={handleChange}
          aria-label="Vertical tabs example"
          className={classes.tabs}>
          <Tab label="Inputs" />
          <Tab label="Graphs" />
          <Tab label="Tables" />
        </Tabs>
        <TabPanel className={classes.panel} value={value} index={0}>
          <Inputs inputs={inputs} onChange={onInputChange} />
        </TabPanel>
        <TabPanel className={classes.panel} value={value} index={1}>
          <Graphs inputs={inputs} />
        </TabPanel>
        <TabPanel className={classes.panel} value={value} index={2}>
          <AmortizationTable inputs={inputs} />
        </TabPanel>
      </Container>
    </div>
  );
};

export default App;
