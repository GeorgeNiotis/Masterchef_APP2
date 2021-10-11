import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';

function SymbolsArray(props) {// or props.title
    function table_fn() {
        if (props.array === undefined) {
            return <TableRow key={0}>
                <TableCell>Loading...</TableCell>
            </TableRow>
        } else {
            return props.array[2].map((pool, i) => (
                <TableRow
                    key={pool.LP_address}
                >
                    <TableCell>{i}</TableCell>
                    <TableCell component='th' >{pool.LP_address}</TableCell>
                    <TableCell align='center'>{pool.token0_symbol}</TableCell>
                    <TableCell align='center'>{pool.token1_symbol}</TableCell>

                </TableRow>
            ))
        }
    }
    return (
        <Paper sx={{ width: '70%', overflow: 'hidden', margin: 'auto', marginTop: '20px', mb: '50px' }}>
            <h2 align='center'><font color='red'>Symbols array</font></h2>
            <TableContainer sx={{ maxHeight: 550 }}>
                <Table stickyHeader aria-label='dense sticky table' size='small'>
                    <TableHead>
                        <TableRow>
                            <TableCell>#</TableCell>
                            <TableCell>lpToken_address</TableCell>
                            <TableCell align='center'>token0_symbol</TableCell>
                            <TableCell align='center'>token1_symbol</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {table_fn()}
                    </TableBody>
                </Table>
            </TableContainer>
        </Paper>
    )
}

SymbolsArray.defaultProps = {
    title: 'Default SymbolsArray component!'
}

export default SymbolsArray
