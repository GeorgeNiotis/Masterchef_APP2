import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';

const TvlAprTable = (props) => {// or props.array
    const tableFn = () => {
        if (props.array === undefined) {
            return <TableRow key={0}>
                <TableCell>Loading...</TableCell>
            </TableRow>
        } else {
            return props.array[2].map((pool, index) => {
                if (pool.tvl) {
                    pool.tvl=pool.tvl.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
                }
                return(
                <TableRow key={pool.LPAddress}>
                    <TableCell>{index}</TableCell>
                    <TableCell component='th' >{pool.token0Symbol}-{pool.token1Symbol}</TableCell>
                    <TableCell align='center'>{pool.tvl}</TableCell>
                    <TableCell align='center'>{props.array[1][index].apr}%</TableCell>
                </TableRow>
                )
            })
        }
    }
    return (
        <Paper sx={{ width: '70%', overflow: 'hidden', margin: 'auto', marginTop: '20px', mb: '50px' }}>
            <h2 align='center'><font color='red'>TVL / APR</font></h2>
            <TableContainer sx={{ maxHeight: 550 }}>
                <Table stickyHeader aria-label='dense sticky table' size='small'>
                    <TableHead>
                        <TableRow>
                            <TableCell>#</TableCell>
                            <TableCell>LPTokenPair</TableCell>
                            <TableCell align='center'>TVL</TableCell>
                            <TableCell align='center'>APR</TableCell>
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

TvlAprTable.defaultProps = {
    title: 'Default TvlAprTable component!'
}

export default TvlAprTable
