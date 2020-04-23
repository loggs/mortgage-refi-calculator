import React from "react";
import Table from "@material-ui/core/Table";
import TableBody from "@material-ui/core/TableBody";
import TableCell from "@material-ui/core/TableCell";
import TableContainer from "@material-ui/core/TableContainer";
import TableHead from "@material-ui/core/TableHead";
import TableRow from "@material-ui/core/TableRow";
import Paper from "@material-ui/core/Paper";
import Container from "@material-ui/core/Container";
import Tabs from "@material-ui/core/Tabs";
import Tab from "@material-ui/core/Tab";
import { makeStyles } from "@material-ui/core/styles";
import NumberFormat from "react-number-format";
import VirtualizedTable from "./VirtualizedTable";
import {
  newPrincipal,
  generateAmortizationTable,
  toFloatSafe,
  minimumPayment,
} from "./finance";

const columns = [
  {
    width: 120,
    label: "Month",
    dataKey: "month",
  },
  {
    width: 120,
    label: "Principal",
    dataKey: "cb",
    numeric: true,
    money: true,
  },
  {
    width: 120,
    label: "Interest",
    dataKey: "interest",
    numeric: true,
    money: true,
  },
  {
    width: 120,
    label: "Payment",
    dataKey: "pay",
    numeric: true,
    money: true,
  },
  {
    width: 120,
    label: "PMI",
    dataKey: "pmipmt",
    numeric: true,
    money: true,
  },
  {
    width: 180,
    label: "Principal Payment",
    dataKey: "ppmt",
    numeric: true,
    money: true,
  },
];

const AmortizationTable = ({ inputs }) => {
  const [tab, setTab] = React.useState(0);
  const handleChange = (_event, newValue) => {
    setTab(newValue);
  };

  const currBal =
    tab === 0 || tab === 1 ? inputs.currentBalance : newPrincipal(inputs);
  const rt = tab === 0 || tab === 1 ? inputs.originalRate : inputs.newRate;
  const pmi = tab === 0 || tab === 1 ? inputs.originalPMI : inputs.newPMI;
  const refimp = toFloatSafe(minimumPayment(inputs, true));
  const maxN = tab === 0 || tab === 1 ? inputs.originalTerm : inputs.newTerm;
  const pmt =
    tab === 0
      ? minimumPayment(inputs)
      : tab === 1
      ? inputs.currentPayment
      : tab === 2
      ? refimp
      : Math.max(refimp, toFloatSafe(inputs.currentPayment));

  const rows = generateAmortizationTable(
    toFloatSafe(inputs.appraisal),
    toFloatSafe(currBal),
    toFloatSafe(rt) / 100,
    toFloatSafe(pmt),
    toFloatSafe(pmi),
    toFloatSafe(maxN),
  );

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
          <Tab label="Current Minimum Payment" />
          <Tab label="Current Planned Payment" />
          <Tab label="ReFi Minimum Payment" />
          <Tab label="Refi Planned Payment" />
        </Tabs>
      </Paper>
      <Paper square style={{ height: "77vh", width: "100%" }}>
        <VirtualizedTable
          rowCount={rows.length}
          rowGetter={({ index }) => rows[index]}
          columns={columns}
        />
      </Paper>
    </Container>
  );
};

export default AmortizationTable;
