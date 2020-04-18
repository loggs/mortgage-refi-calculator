import React from "react";
import Grid from "@material-ui/core/Grid";
import TextField from "@material-ui/core/TextField";
import { makeStyles, withStyles } from "@material-ui/core/styles";
import ExpansionPanel from "@material-ui/core/ExpansionPanel";
import ExpansionPanelSummary from "@material-ui/core/ExpansionPanelSummary";
import ExpansionPanelDetails from "@material-ui/core/ExpansionPanelDetails";
import Typography from "@material-ui/core/Typography";
import ExpandMoreIcon from "@material-ui/icons/ExpandMore";
import NumberFormat from "react-number-format";
import Finance from "financejs";

const finance = new Finance();

const useStyles = makeStyles(theme => ({
  root: {
    width: "100%",
  },
  heading: {
    fontSize: theme.typography.pxToRem(15),
    fontWeight: theme.typography.fontWeightRegular,
  },
}));

const payment = (P, I, N, Q) => {
  return P * (I / Q / (1 - (1 + I / Q) ** -N));
};

const cumulativeInterest = (P, I, N, B, E) => {
  const Q = 12;
  const M = payment(P, I, N, Q);
  return (
    (P - (M * Q) / I) * (1 + I / Q) ** (B - 1) +
    (M * Q) / I -
    ((P - (M * Q) / I) * (1 + I / Q) ** E + (M * Q) / I) -
    M * (E - B + 1)
  );
};

const MoneyFormat = props => {
  const { inputRef, onChange, ...other } = props;

  return (
    <NumberFormat
      {...other}
      getInputRef={inputRef}
      onValueChange={values => {
        onChange({
          target: {
            name: props.name,
            value: values.value,
          },
        });
      }}
      thousandSeparator
      isNumericString
      prefix="$"
    />
  );
};

const PercentFormat = props => {
  const { inputRef, onChange, ...other } = props;

  return (
    <NumberFormat
      {...other}
      getInputRef={inputRef}
      onValueChange={values => {
        onChange({
          target: {
            name: props.name,
            value: values.value,
          },
        });
      }}
      isNumericString
      suffix="%"
    />
  );
};

const DefaultInput = props => {
  const customInputs = props.percent
    ? { inputComponent: PercentFormat }
    : props.money
    ? { inputComponent: MoneyFormat }
    : {};
  const hold = props.percent ? "0%" : props.money ? "$0" : props.placeholder;
  return (
    <TextField
      placeholder={hold}
      variant="outlined"
      InputProps={customInputs}
      size="small"
      {...props}
    />
  );
};

const StyledInput = withStyles({
  root: {
    "& label.Mui-focused": {
      color: "#607d8b",
    },
    "& .MuiInput-underline:after": {
      borderBottomColor: "#607d8b",
    },
    "& .MuiOutlinedInput-root": {
      "&.Mui-focused fieldset": {
        borderColor: "#607d8b",
      },
    },
  },
})(DefaultInput);

const minimumPayment = inputs => {
  return (
    Math.round(
      (finance.AM(
        inputs.originalPrincipal,
        inputs.originalRate,
        inputs.originalTerm,
        1,
      ) +
        (inputs.originalPrincipal >= inputs.appraisal * 0.8
          ? inputs.originalPMI / 12
          : 0)) *
        100,
    ) / 100
  );
};

const Inputs = ({ inputs, onChange }) => {
  const [panels, setPanels] = React.useState({
    original: true,
    refi: true,
    totals: true,
  });

  const togglePanel = panel => (_event, isExpanded) => {
    setPanels({
      ...panels,
      [panel]: isExpanded,
    });
  };

  const classes = useStyles();
  return (
    <div>
      <ExpansionPanel
        expanded={panels.original}
        onChange={togglePanel("original")}>
        <ExpansionPanelSummary
          expandIcon={<ExpandMoreIcon />}
          aria-controls="panel1a-content"
          id="panel1a-header">
          <Typography className={classes.heading}>
            Original Loan Details
          </Typography>
        </ExpansionPanelSummary>
        <ExpansionPanelDetails>
          <Grid container spacing={2}>
            <Grid item sm={3}>
              <StyledInput
                value={inputs.appraisal}
                onChange={onChange("appraisal")}
                label="Appraisal"
                money
              />
            </Grid>
            <Grid item sm={3}>
              <StyledInput
                value={inputs.originalPrincipal}
                onChange={onChange("originalPrincipal")}
                label="Original Principal"
                money
              />
            </Grid>
            <Grid item sm={3}>
              <StyledInput
                value={inputs.originalRate}
                onChange={onChange("originalRate")}
                label="Rate"
                percent
              />
            </Grid>
            <Grid item sm={3}>
              <StyledInput
                value={inputs.originalTerm}
                onChange={onChange("originalTerm")}
                label="Term (months)"
              />
            </Grid>
            <Grid item sm={3}>
              <StyledInput
                value={inputs.originalPMI}
                onChange={onChange("originalPMI")}
                label="PMI/MIP"
                money
              />
            </Grid>
            <Grid item sm={3}>
              <StyledInput
                value={inputs.currentPayment}
                onChange={onChange("currentPayment")}
                label="Current Payment"
                money
              />
            </Grid>
            <Grid item sm={3}>
              <StyledInput
                value={inputs.currentBalance}
                onChange={onChange("currentBalance")}
                label="Current Balance"
                money
              />
            </Grid>
            <Grid item sm={3} />
            <Grid item sm={3}>
              <StyledInput
                disabled
                money
                value={minimumPayment(inputs)}
                label="Minimum Payment"
              />
            </Grid>
            <Grid item sm={3}>
              <StyledInput
                disabled
                money
                value={inputs.currentPayment - minimumPayment(inputs)}
                label="Additional Payment"
              />
            </Grid>
          </Grid>
        </ExpansionPanelDetails>
      </ExpansionPanel>
      <ExpansionPanel expanded={panels.refi} onChange={togglePanel("refi")}>
        <ExpansionPanelSummary
          expandIcon={<ExpandMoreIcon />}
          aria-controls="panel2a-content"
          id="panel2a-header">
          <Typography className={classes.heading}>
            Refinance Assumptions
          </Typography>
        </ExpansionPanelSummary>
        <ExpansionPanelDetails>
          <Grid container spacing={2}>
            <Grid item sm={3}>
              <StyledInput
                value={inputs.closingCosts}
                onChange={onChange("closingCosts")}
                label="Closing Costs"
                money
              />
            </Grid>
            <Grid item sm={3}>
              <StyledInput
                value={inputs.newRate}
                onChange={onChange("newRate")}
                label="Rate"
                percent
              />
            </Grid>
            <Grid item sm={3}>
              <StyledInput
                value={inputs.newTerm}
                onChange={onChange("newTerm")}
                label="Term (months)"
              />
            </Grid>
            <Grid item sm={3}>
              <StyledInput
                value={inputs.newPMI}
                onChange={onChange("newPMI")}
                label="PMI/MIP"
                money
              />
            </Grid>
            <Grid item sm={3}>
              <StyledInput
                value={inputs.cashOut}
                onChange={onChange("cashOut")}
                label="Cash Out"
                money
              />
            </Grid>
          </Grid>
        </ExpansionPanelDetails>
      </ExpansionPanel>
      <ExpansionPanel expanded={panels.totals}>
        <ExpansionPanelSummary
          aria-controls="panel2a-content"
          id="panel2a-header">
          <Typography className={classes.heading}>Calculations</Typography>
        </ExpansionPanelSummary>
        <ExpansionPanelDetails>
          <Grid container spacing={2}>
            <Grid item sm={3}>
              <DefaultInput label="CM - Remaining Months" />
            </Grid>
            <Grid item sm={3}>
              <DefaultInput label="CM - Total Interest" />
            </Grid>
            <Grid item sm={6} />
            <Grid item sm={3}>
              <DefaultInput label="Term (months)" />
            </Grid>
            <Grid item sm={3}>
              <DefaultInput label="PMI/MIP" />
            </Grid>
          </Grid>
        </ExpansionPanelDetails>
      </ExpansionPanel>
    </div>
  );
};

export default Inputs;
