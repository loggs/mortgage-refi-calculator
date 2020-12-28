import React from "react";
import axios from "axios";
import Grid from "@material-ui/core/Grid";
import TextField from "@material-ui/core/TextField";
import { makeStyles, withStyles } from "@material-ui/core/styles";
import MuiExpansionPanel from "@material-ui/core/ExpansionPanel";
import ExpansionPanelSummary from "@material-ui/core/ExpansionPanelSummary";
import ExpansionPanelDetails from "@material-ui/core/ExpansionPanelDetails";
import Typography from "@material-ui/core/Typography";
import Button from "@material-ui/core/Button";
import Card from "@material-ui/core/Card";
import Dialog from "@material-ui/core/Dialog";
import DialogContent from "@material-ui/core/DialogContent";
import DialogTitle from "@material-ui/core/DialogTitle";
import DialogActions from "@material-ui/core/DialogActions";
import Paper from "@material-ui/core/Paper";
import SnackBar from "@material-ui/core/SnackBar";
import CardContent from "@material-ui/core/CardContent";
import ExpandMoreIcon from "@material-ui/icons/ExpandMore";
import ArrowForwardIcon from "@material-ui/icons/ArrowForward";
import ShareIcon from "@material-ui/icons/Share";
import NumberFormat from "react-number-format";
import {
  cumulativeInterest,
  nper,
  roundMoney,
  minimumPayment,
  toFloatSafe,
  newPrincipal,
  generateAllAmortizationTables,
} from "./finance";

const ExpansionPanel = withStyles({
  root: {
    border: "1px solid rgba(0, 0, 0, .125)",
    boxShadow: "none",
    "&:not(:last-child)": {
      borderBottom: 0,
    },
    "&:before": {
      display: "none",
    },
    "&$expanded": {
      margin: "auto",
    },
  },
  expanded: {},
})(MuiExpansionPanel);

const useStyles = makeStyles(theme => ({
  root: {
    width: "100%",
  },
  heading: {
    fontSize: theme.typography.pxToRem(15),
    fontWeight: theme.typography.fontWeightRegular,
  },
  arrow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
}));

const calcPayback = inputs => {
  const { cm, cmwa, refi, refiwa } = generateAllAmortizationTables(inputs);

  const closing = toFloatSafe(inputs.closingCosts);

  let refiDiff = 0;
  let refiwaDiff = 0;

  let refiMonths = 0;
  let refiwaMonths = 0;

  let cmi = 0;
  let cmwai = 0;
  let refii = 0;
  let refiwai = 0;
  const withDefault = (x, def) => (x || {}).interest || def;
  for (let i = 0; i <= 360; i++) {
    cmi = withDefault(cm[i], cmi);
    cmwai = withDefault(cmwa[i], cmwai);
    refii = withDefault(refi[i], refii);
    refiwai = withDefault(refiwa[i], refiwai);

    refiDiff = refiDiff + (cmi - refii);
    refiwaDiff = refiwaDiff + (cmwai - refiwai);

    if (refiDiff >= closing && refiMonths === 0) {
      refiMonths = i + 1;
    }

    if (refiwaDiff >= closing && refiwaMonths === 0) {
      refiwaMonths = i + 1;
    }
  }

  return { refiMonths, refiwaMonths };
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
      prefix="$ "
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

const DefaultInput = ({ percent, money, placeholder, value, ...other }) => {
  const customInputs = percent
    ? { inputComponent: PercentFormat }
    : money
    ? { inputComponent: MoneyFormat }
    : null;
  const hold = percent ? "0%" : money ? "$0" : placeholder;
  return (
    <TextField
      placeholder={hold}
      variant="outlined"
      InputProps={customInputs}
      size="small"
      value={value || ""}
      style={{ width: "100%" }}
      {...other}
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

const allNPER = inputs => {
  const cmmp = minimumPayment(inputs);
  const originalTerm = toFloatSafe(inputs.originalTerm);
  const validCM = term => Math.min(term, originalTerm);
  const adj =
    toFloatSafe(inputs.originalPrincipal) >= toFloatSafe(inputs.appraisal) * 0.8
      ? toFloatSafe(inputs.originalPMI) / 12
      : 0;
  // CM
  const cm = validCM(
    nper(
      parseFloat(inputs.originalRate) / 1200,
      cmmp - adj,
      -parseFloat(inputs.currentBalance),
    ),
  );
  // CM w/ Additional
  const cmwa = validCM(
    nper(
      parseFloat(inputs.originalRate) / 1200,
      parseFloat(inputs.currentPayment) - adj,
      -parseFloat(inputs.currentBalance),
    ),
  );
  // ReFi

  const np = newPrincipal(inputs);
  const refimp = minimumPayment(inputs, 1);
  const refiadj =
    np >= toFloatSafe(inputs.appraisal) * 0.8
      ? toFloatSafe(inputs.newPMI) / 12
      : 0;
  const newTerm = parseFloat(inputs.newTerm);
  const validREFI = term => Math.min(newTerm, term);
  const refi = validREFI(
    nper(parseFloat(inputs.newRate) / 1200, refimp - refiadj, -np),
  );
  // ReFi w/ Additional
  const wapmt = Math.max(refimp, inputs.currentPayment);
  const refiwa = validREFI(
    nper(parseFloat(inputs.newRate) / 1200, wapmt - refiadj, -np),
  );

  return { cm, cmwa, refi, refiwa, cmmp, refimp, np };
};

const allCUMIPMT = (inputs, { cm, cmwa, refi, refiwa, np }) => {
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

const useCardStyles = makeStyles(theme => ({
  card: {
    backgroundColor: "#78909c",
  },
  content: {
    padding: theme.spacing(1),
    paddingBottom: theme.spacing(1) + "px !important",
  },
  header: {
    color: "white",
    fontSize: "10px",
  },
  text: {
    color: "white",
  },
}));

const CalculatedNumber = ({ title, value }) => {
  const classes = useCardStyles();
  return (
    <Card className={classes.card}>
      <CardContent className={classes.content}>
        <Typography className={classes.header}>{title}</Typography>
        <Typography className={classes.text}>{value}</Typography>
      </CardContent>
    </Card>
  );
};

const useTotalsStyles = makeStyles(theme => ({
  card: {
    backgroundColor: "#78909c",
  },
  content: {
    padding: theme.spacing(1),
    paddingBottom: theme.spacing(1) + "px !important",
  },
  header: {
    color: "white",
    fontSize: "10px",
  },
  text: {
    color: "white",
  },
  bigHeader: {
    color: "white",
    fontSize: "15px",
  },
}));

const TotalsBoxes = ({ titleA, valueA, titleB, valueB, bigTitle }) => {
  const classes = useTotalsStyles();
  return (
    <Card className={classes.card}>
      <CardContent className={classes.content}>
        <Typography className={classes.bigHeader}>
          <strong>{bigTitle}</strong>
        </Typography>
        <Typography className={classes.header}>{titleA}</Typography>
        <Typography className={classes.text}>{valueA}</Typography>
        <Typography className={classes.header}>{titleB}</Typography>
        <Typography className={classes.text}>{valueB}</Typography>
      </CardContent>
    </Card>
  );
};

const Inputs = ({ inputs, onChange }) => {
  const [panels, setPanels] = React.useState({
    original: true,
    refi: true,
    totals: true,
  });

  const [shareId, setShareId] = React.useState(null);
  const [copied, setCopied] = React.useState(false);

  const handleSnackBarClose = (event, reason) => {
    if (reason === "clickaway") {
      return;
    }

    setCopied(false);
  };

  const onSave = async () => {
    try {
      const response = await axios.post("/.netlify/functions/save", inputs);
      setShareId(response.data.ref["@ref"].id);
    } catch (err) {
      console.log(err);
    }
  };

  const togglePanel = panel => (_event, isExpanded) => {
    setPanels({
      ...panels,
      [panel]: isExpanded,
    });
  };

  const remainingMonths = allNPER(inputs);
  const { cm, cmwa, refi, refiwa, cmmp, refimp, np } = remainingMonths;

  const { cmip, cmwaip, refiip, refiwaip } = allCUMIPMT(
    inputs,
    remainingMonths,
  );

  const pp = Math.max(refimp, toFloatSafe(inputs.currentPayment));
  const classes = useStyles();

  const { refiMonths, refiwaMonths } = calcPayback(inputs);

  return (
    <div>
      <SnackBar
        anchorOrigin={{
          vertical: "top",
          horizontal: "left",
        }}
        open={copied}
        autoHideDuration={2000}
        onClose={handleSnackBarClose}
        message="Copied to clipboard!"
      />

      <Dialog
        onClose={() => setShareId(null)}
        open={Boolean(shareId)}
        maxWidth="sm"
        fullWidth={true}>
        <Paper>
          <DialogTitle>Custom URL</DialogTitle>
          <DialogContent
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}>
            <StyledInput
              style={{ width: "80%" }}
              variant="outlined"
              value={`${window.location.href}?id=${shareId}`}
            />
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => {
                navigator.clipboard.writeText(
                  `${window.location.href}?id=${shareId}`,
                );
                setCopied(true);
              }}>
              Copy
            </Button>
          </DialogActions>
        </Paper>
      </Dialog>
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
            <Grid item sm={2}>
              <StyledInput
                value={inputs.appraisal}
                onChange={onChange("appraisal")}
                label="Purchase Price"
                money={1}
              />
            </Grid>
            <Grid item sm={2}>
              <StyledInput
                value={inputs.appraisal}
                onChange={onChange("currentValue")}
                label="Current Value"
                money={1}
              />
            </Grid>
            <Grid item sm={2}>
              <StyledInput
                value={inputs.originalPrincipal}
                onChange={onChange("originalPrincipal")}
                label="Original Principal"
                money={1}
              />
            </Grid>
            <Grid item sm={2}>
              <StyledInput
                value={inputs.originalRate}
                onChange={onChange("originalRate")}
                label="Rate"
                percent={1}
              />
            </Grid>
            <Grid item sm={2}>
              <StyledInput
                value={inputs.originalTerm}
                onChange={onChange("originalTerm")}
                label="Term (months)"
              />
            </Grid>
            <Grid item sm={2} />
            <Grid item sm={2}>
              <StyledInput
                value={inputs.originalPMI}
                onChange={onChange("originalPMI")}
                label="PMI/MIP"
                money={1}
              />
            </Grid>

            <Grid item sm={2}>
              <StyledInput
                value={inputs.currentPayment}
                onChange={onChange("currentPayment")}
                label="Current P+I"
                money={1}
              />
            </Grid>
            <Grid item sm={2}>
              <StyledInput
                value={inputs.currentBalance}
                onChange={onChange("currentBalance")}
                label="Current Balance"
                money={1}
              />
            </Grid>

            <Grid item sm={2}>
              <StyledInput
                value={inputs.monthlyEscrow}
                onChange={onChange("monthlyEscrow")}
                label="Monthly Escrow"
                money={1}
              />
            </Grid>

            <Grid item sm={4} />
            <Grid item sm={2}>
              <CalculatedNumber
                title="Existing Minimum P+I Payment"
                value={
                  <NumberFormat
                    value={roundMoney(cmmp) || "-"}
                    displayType="text"
                    thousandSeparator={true}
                    prefix="$ "
                  />
                }
              />
            </Grid>
            <Grid item sm={2}>
              <CalculatedNumber
                title="Monthly P+I Add. Payment"
                value={
                  <NumberFormat
                    value={roundMoney(inputs.currentPayment - cmmp) || "-"}
                    displayType="text"
                    thousandSeparator={true}
                    prefix="$ "
                  />
                }
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
            <Grid item sm={2}>
              <StyledInput
                value={inputs.closingCosts}
                onChange={onChange("closingCosts")}
                label="Closing Costs"
                money={1}
              />
            </Grid>
            <Grid item sm={2}>
              <StyledInput
                value={inputs.newRate}
                onChange={onChange("newRate")}
                label="Rate"
                percent={1}
              />
            </Grid>
            <Grid item sm={2}>
              <StyledInput
                value={inputs.newTerm}
                onChange={onChange("newTerm")}
                label="Term (months)"
              />
            </Grid>
            <Grid item sm={2}>
              <StyledInput
                value={inputs.newPMI}
                onChange={onChange("newPMI")}
                label="PMI/MIP"
                money={1}
              />
            </Grid>
            <Grid item sm={2}>
              <StyledInput
                value={inputs.cashOut}
                onChange={onChange("cashOut")}
                label={`Cash ${
                  parseFloat(inputs.cashOut) < 0 ? "From" : "To"
                } Borrower`}
                money={1}
              />
            </Grid>

            <Grid item sm={2}>
              <StyledInput
                value={inputs.escrowRefund}
                onChange={onChange("escrowRefund")}
                label="Escrow Refund"
                money={1}
              />
            </Grid>

            <Grid item sm={2}>
              <CalculatedNumber
                title="New Loan Amount"
                value={
                  <NumberFormat
                    value={roundMoney(np) || "-"}
                    displayType="text"
                    thousandSeparator={true}
                    prefix="$ "
                  />
                }
              />
            </Grid>
            <Grid item sm={2}>
              <CalculatedNumber
                title="New Monthly P+I Payment"
                value={
                  <NumberFormat
                    value={roundMoney(refimp) || "-"}
                    displayType="text"
                    thousandSeparator={true}
                    prefix="$ "
                  />
                }
              />
            </Grid>
            <Grid item sm={2}>
              <CalculatedNumber
                title="Monthly P+I Add. Payment"
                value={
                  <NumberFormat
                    value={roundMoney(pp - refimp) || "-"}
                    displayType="text"
                    thousandSeparator={true}
                    prefix="$ "
                  />
                }
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
          <Button
            onClick={onSave}
            size="small"
            variant="outlined"
            style={{
              padding: 0,
              marginLeft: "20px",
              paddingRight: "5px",
              paddingLeft: "5px",
            }}>
            <ShareIcon fontSize="small" style={{ marginRight: "5px" }} />
            Share
          </Button>
        </ExpansionPanelSummary>
        <ExpansionPanelDetails>
          <Grid container spacing={2}>
            <Grid item sm={2}>
              <TotalsBoxes
                bigTitle="Current Mortgage"
                titleA="Remaining Months"
                valueA={
                  <NumberFormat
                    value={roundMoney(cm) || "-"}
                    displayType="text"
                  />
                }
                titleB="Total Interest"
                valueB={
                  <NumberFormat
                    value={roundMoney(cmip) || "-"}
                    displayType="text"
                    thousandSeparator={true}
                    prefix="$ "
                  />
                }
              />
            </Grid>
            <Grid item sm={1} className={classes.arrow}>
              <ArrowForwardIcon fontSize="large" />
            </Grid>
            <Grid item sm={2}>
              <TotalsBoxes
                bigTitle="Refinance"
                titleA="Remaining Months"
                valueA={
                  <NumberFormat
                    value={roundMoney(refi) || "-"}
                    displayType="text"
                  />
                }
                titleB="Total Interest"
                valueB={
                  <NumberFormat
                    value={roundMoney(refiip) || "-"}
                    displayType="text"
                    thousandSeparator={true}
                    prefix="$ "
                  />
                }
              />
            </Grid>

            <Grid item sm={1} className={classes.arrow}>
              <ArrowForwardIcon fontSize="large" />
            </Grid>

            <Grid item sm={2}>
              <TotalsBoxes
                bigTitle="Normal Impact"
                titleA={`Months ${cm > refi ? "faster" : "slower"}`}
                valueA={
                  <NumberFormat
                    value={roundMoney(Math.abs(cm - refi)) || "-"}
                    displayType="text"
                  />
                }
                titleB={`${cmip > refiip ? "Less" : "More"} Interest Paid`}
                valueB={
                  <NumberFormat
                    value={Math.abs(roundMoney(cmip - refiip)) || "-"}
                    displayType="text"
                    thousandSeparator={true}
                    prefix="$ "
                  />
                }
              />
            </Grid>

            <Grid item sm={4} />

            <Grid item sm={2}>
              <TotalsBoxes
                bigTitle="Current Mortgage w/ Add. Payment"
                titleA="Remaining Months"
                valueA={
                  <NumberFormat
                    value={roundMoney(cmwa) || "-"}
                    displayType="text"
                  />
                }
                titleB="Total Interest"
                valueB={
                  <NumberFormat
                    value={roundMoney(cmwaip) || "-"}
                    displayType="text"
                    thousandSeparator={true}
                    prefix="$ "
                  />
                }
              />
            </Grid>

            <Grid item sm={1} className={classes.arrow}>
              <ArrowForwardIcon fontSize="large" />
            </Grid>
            <Grid item sm={2}>
              <TotalsBoxes
                bigTitle="Refinance w/ Current P+I Payment"
                titleA="Remaining Months"
                valueA={
                  <NumberFormat
                    value={roundMoney(refiwa) || "-"}
                    displayType="text"
                  />
                }
                titleB="Total Interest"
                valueB={
                  <NumberFormat
                    value={roundMoney(refiwaip) || "-"}
                    displayType="text"
                    thousandSeparator={true}
                    prefix="$ "
                  />
                }
              />
            </Grid>

            <Grid item sm={1} className={classes.arrow}>
              <ArrowForwardIcon fontSize="large" />
            </Grid>

            <Grid item sm={2}>
              <TotalsBoxes
                bigTitle="Additional Payment Impact"
                titleA={`Months ${cmwa > refiwa ? "Faster" : "Slower"}`}
                valueA={
                  <NumberFormat
                    value={roundMoney(Math.abs(cmwa - refiwa)) || "-"}
                    displayType="text"
                  />
                }
                titleB={`${cmwaip > refiwaip ? "Less" : "More"} Interest Paid`}
                valueB={
                  <NumberFormat
                    value={Math.abs(roundMoney(cmwaip - refiwaip)) || "-"}
                    displayType="text"
                    thousandSeparator={true}
                    prefix="$ "
                  />
                }
              />
            </Grid>
            <Grid item sm={1} />
            <Grid item sm={3}>
              <TotalsBoxes
                bigTitle="Recoupment Period"
                titleA="For Closing Costs/Rate Discount"
                valueA={
                  <NumberFormat
                    value={roundMoney(refiMonths) || "-"}
                    displayType="text"
                    suffix=" months"
                  />
                }
              />
            </Grid>
          </Grid>
        </ExpansionPanelDetails>
      </ExpansionPanel>
    </div>
  );
};

export default Inputs;
