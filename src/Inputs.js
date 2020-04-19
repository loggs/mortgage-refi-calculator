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
    roundMoney(
      (P - (M * Q) / I) * (1 + I / Q) ** (B - 1) +
        (M * Q) / I -
        ((P - (M * Q) / I) * (1 + I / Q) ** E + (M * Q) / I) -
        M * (E - B + 1),
    ) || ""
  );
};

const nper = (rate, payment, present) => {
  const num = payment;
  const den = present * rate + payment;
  return roundMoney(Math.log(num / den) / Math.log(1 + rate)) || "";
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
    : null;
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

const roundMoney = money => {
  return Math.round(money * 100) / 100;
};

const minimumPayment = (inputs, refi) => {
  const op = toFloatSafe(
    refi ? newPrincipal(inputs) : inputs.originalPrincipal,
  );
  const rate = toFloatSafe(refi ? inputs.newRate : inputs.originalRate);
  const term = toFloatSafe(refi ? inputs.newTerm : inputs.originalTerm);
  const pmi = toFloatSafe(refi ? inputs.newPMI : inputs.originalPMI);
  return (
    roundMoney(
      finance.AM(op, rate, term, 1) +
        (op >= toFloatSafe(inputs.appraisal) * 0.8 ? pmi / 12 : 0),
    ) || ""
  );
};

const toFloatSafe = n => parseFloat(n) || 0;

const newPrincipal = ({ currentBalance, cashOut, closingCosts }) => {
  return (
    toFloatSafe(currentBalance) +
    toFloatSafe(cashOut) +
    toFloatSafe(closingCosts)
  );
};

const allNPER = inputs => {
  const cmmp = minimumPayment(inputs);
  const adj =
    toFloatSafe(inputs.originalPrincipal) >= toFloatSafe(inputs.appraisal) * 0.8
      ? toFloatSafe(inputs.originalPMI) / 12
      : 0;
  // CM
  const cm = nper(
    parseFloat(inputs.originalRate) / 1200,
    cmmp - adj,
    -parseFloat(inputs.currentBalance),
  );
  // CM w/ Additional
  const cmwa = nper(
    parseFloat(inputs.originalRate) / 1200,
    parseFloat(inputs.currentPayment) - adj,
    -parseFloat(inputs.currentBalance),
  );
  // ReFi

  const np = newPrincipal(inputs);
  const refimp = minimumPayment(inputs, 1);

  const refi = nper(parseFloat(inputs.newRate) / 1200, refimp, -np);
  // ReFi w/ Additional
  const refiwa = nper(parseFloat(inputs.originalRate) / 1200, refimp, -np);

  return { cm, cmwa, refi, refiwa, cmmp, refimp };
};

const allCUMIPMT = (inputs, { cm, cmwa, refi, refiwa }) => {
  // CM
  const cmip = -cumulativeInterest(
    toFloatSafe(inputs.currentBalance),
    toFloatSafe(inputs.originalRate) / 100,
    cm,
    1,
    cm,
  );

  // CM w/ Additional
  const cmwaip = -cumulativeInterest(
    toFloatSafe(inputs.currentBalance),
    toFloatSafe(inputs.originalRate) / 100,
    cmwa,
    1,
    cmwa,
  );

  const np = newPrincipal(inputs);
  // ReFi
  const refiip = -cumulativeInterest(
    np,
    toFloatSafe(inputs.newRate) / 100,
    refi,
    1,
    refi,
  );
  // ReFi w/ Additional
  const refiwaip = -cumulativeInterest(
    np,
    toFloatSafe(inputs.newRate) / 100,
    refiwa,
    1,
    refiwa,
  );

  return { cmip, cmwaip, refiip, refiwaip };
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

  const remainingMonths = allNPER(inputs);
  const { cm, cmwa, refi, refiwa, cmmp, refimp } = remainingMonths;

  const { cmip, cmwaip, refiip, refiwaip } = allCUMIPMT(
    inputs,
    remainingMonths,
  );

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
                money={1}
              />
            </Grid>
            <Grid item sm={3}>
              <StyledInput
                value={inputs.originalPrincipal}
                onChange={onChange("originalPrincipal")}
                label="Original Principal"
                money={1}
              />
            </Grid>
            <Grid item sm={3}>
              <StyledInput
                value={inputs.originalRate}
                onChange={onChange("originalRate")}
                label="Rate"
                percent={1}
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
                money={1}
              />
            </Grid>
            <Grid item sm={3}>
              <StyledInput
                value={inputs.currentPayment}
                onChange={onChange("currentPayment")}
                label="Current Payment"
                money={1}
              />
            </Grid>
            <Grid item sm={3}>
              <StyledInput
                value={inputs.currentBalance}
                onChange={onChange("currentBalance")}
                label="Current Balance"
                money={1}
              />
            </Grid>
            <Grid item sm={3} />
            <Grid item sm={3}>
              <StyledInput
                disabled
                money={1}
                value={cmmp}
                label="Minimum Payment"
              />
            </Grid>
            <Grid item sm={3}>
              <StyledInput
                disabled
                money={1}
                value={roundMoney(inputs.currentPayment - cmmp)}
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
                money={1}
              />
            </Grid>
            <Grid item sm={3}>
              <StyledInput
                value={inputs.newRate}
                onChange={onChange("newRate")}
                label="Rate"
                percent={1}
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
                money={1}
              />
            </Grid>
            <Grid item sm={3}>
              <StyledInput
                value={inputs.cashOut}
                onChange={onChange("cashOut")}
                label="Cash Out"
                money={1}
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
              <DefaultInput value={cm} label="CM - Remaining Months" />
            </Grid>
            <Grid item sm={3}>
              <DefaultInput value={cmip} label="CM - Total Interest" />
            </Grid>
            <Grid item sm={3}>
              <DefaultInput
                value={cmwa}
                label="CM w/ Additions - Remaining Months"
              />
            </Grid>
            <Grid item sm={3}>
              <DefaultInput
                value={cmwaip}
                label="CM w/ Additions - Total Interest"
              />
            </Grid>

            <Grid item sm={3}>
              <DefaultInput value={refi} label="ReFi- Remaining Months" />
            </Grid>
            <Grid item sm={3}>
              <DefaultInput value={refiip} label="ReFi - Total Interest" />
            </Grid>
            <Grid item sm={3}>
              <DefaultInput
                value={refiwa}
                label="ReFi w/ Additions - Remaining Months"
              />
            </Grid>
            <Grid item sm={3}>
              <DefaultInput
                value={refiwaip}
                label="Refi w/ Additions - Total Interest"
              />
            </Grid>
          </Grid>
        </ExpansionPanelDetails>
      </ExpansionPanel>
    </div>
  );
};

export default Inputs;
