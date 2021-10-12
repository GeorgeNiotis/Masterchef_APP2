import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';

const SymbolsArrayComp = (props) => {// or props.title
    const tableFn = () => {
        if (props.array === undefined) {
            return <TableRow key={0}>
                <TableCell>Loading...</TableCell>
            </TableRow>
        } else {
            return props.array[2].map((pool, i) => (
                <TableRow
                    key={pool.LPAddress}
                >
                    <TableCell>{i}</TableCell>
                    <TableCell component='th' >{pool.LPAddress}</TableCell>
                    <TableCell align='center'>{pool.token0Symbol}</TableCell>
                    <TableCell align='center'>{pool.token1Symbol}</TableCell>

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
                            <TableCell>lpTokenAddress</TableCell>
                            <TableCell align='center'>token0Symbol</TableCell>
                            <TableCell align='center'>token1Symbol</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {tableFn()}
                    </TableBody>
                </Table>
            </TableContainer>
        </Paper>
    )
}

SymbolsArrayComp.defaultProps = {
    title: 'Default SymbolsArrayComp component!'
}

export default SymbolsArrayComp
