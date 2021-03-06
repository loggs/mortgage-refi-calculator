import React from "react";
import Paper from "@material-ui/core/Paper";
import { makeStyles } from "@material-ui/core/styles";
import Tabs from "@material-ui/core/Tabs";
import Tab from "@material-ui/core/Tab";
import Container from "@material-ui/core/Container";
import {
  LineChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Line,
} from "recharts";
import {
  newPrincipal,
  generateAmortizationTable,
  toFloatSafe,
  minimumPayment,
  generateAllAmortizationTables,
  roundMoney,
} from "./finance";

const useStyles = makeStyles(theme => ({
  graphContainer: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    height: "77vh",
  },
}));

const generateLineData = inputs => {
  let data = [];
  let cmagg = 0;
  let cmwaagg = 0;
  let refiagg = 0;
  let refiwaagg = 0;

  const { cm, cmwa, refi, refiwa } = generateAllAmortizationTables(inputs);

  for (let i = 0; i <= 360; i++) {
    let cmi = cm[i] || {};
    let cmwai = cmwa[i] || {};
    let refii = refi[i] || {};
    let refiwai = refiwa[i] || {};
    cmagg = roundMoney(cmagg + (cmi.interest || 0));
    cmwaagg = roundMoney(cmwaagg + (cmwai.interest || 0));
    refiagg = roundMoney(refiagg + (refii.interest || 0));
    refiwaagg = roundMoney(refiwaagg + (refiwai.interest || 0));

    let d = {
      month: i + 1,
      pcm: cmi.cb,
      icm: cmagg,
      pcmwa: cmwai.cb,
      icmwa: cmwaagg,
      prefi: refii.cb,
      irefi: refiagg,
      prefiwa: refiwai.cb,
      irefiwa: refiwaagg,
    };

    data.push(d);
  }

  return data;
};

const interestColumns = [
  { label: "Current Mortgage", key: "icm", stroke: "#8884d8" },
  {
    label: "Current Mortgage w/ Additional Payment",
    key: "icmwa",
    stroke: "#82ca9d",
  },
  { label: "Refinance", key: "irefi", stroke: "red" },
  {
    label: "Refinance w/ Additional Payment",
    key: "irefiwa",
    stroke: "blue",
  },
];

const principalColumns = [
  { label: "Current Mortgage", key: "pcm", stroke: "#8884d8" },
  {
    label: "Current Mortgage w/ Additional Payment",
    key: "pcmwa",
    stroke: "#82ca9d",
  },
  { label: "Refinance", key: "prefi", stroke: "red" },
  {
    label: "Refinance w/ Additional Payment",
    key: "prefiwa",
    stroke: "blue",
  },
];

const Graphs = ({ inputs }) => {
  const classes = useStyles();
  const [tab, setTab] = React.useState(0);
  const handleChange = (_event, newValue) => {
    setTab(newValue);
  };

  const columns = tab === 0 ? principalColumns : interestColumns;

  const data = generateLineData(inputs);

  return (
    <Container maxWidth={false}>
      <Paper square style={{ width: "100%" }}>
        <Tabs
          centered
          value={tab}
          indicatorColor="primary"
          textColor="primary"
          onChange={handleChange}
          aria-label="disabled tabs example">
          <Tab label="Principal Remaining" />
          <Tab label="Cumulative Interest" />
        </Tabs>
      </Paper>

      <Paper className={classes.graphContainer}>
        <LineChart
          width={1000}
          height={500}
          data={data}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis />
          <Legend />
          {columns.map(c => (
            <Line
              type="monotone"
              dataKey={c.key}
              stroke={c.stroke}
              name={c.label}
              dot={false}
            />
          ))}
          <Tooltip />
        </LineChart>
      </Paper>
    </Container>
  );
};

export default Graphs;
