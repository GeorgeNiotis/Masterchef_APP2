import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';

function ActivePools(props) {// or props.title


    function table_fn() {
        if (props.array === undefined) {
            return <TableRow key={0}>
                <TableCell>Loading...</TableCell>
            </TableRow>
        } else {
            return props.array[1].map((pool, i) => (
                <TableRow key={pool.lpToken_address}>
                    <TableCell>{i}</TableCell>
                    <TableCell component='th' >{pool.lpToken_address}</TableCell>
                    <TableCell align='center'>{pool.reward}</TableCell>
                    <TableCell align='center'>{pool.reward_per_block_percent}%</TableCell>
                </TableRow>
            ))
        }
    }
    return (
        <Paper sx={{ width: '70%', overflow: 'hidden', margin: 'auto', marginTop: '30px' }}>
            <h2 align='center'><font color='red'>Active pools</font></h2>
            <TableContainer sx={{ maxHeight: 550 }}>
                <Table stickyHeader aria-label='dense sticky table' size='small'>
                    <TableHead>
                        <TableRow>
                            <TableCell>#</TableCell>
                            <TableCell>lpToken_address</TableCell>
                            <TableCell align='center'>reward</TableCell>
                            <TableCell align='center'>reward_per_block%</TableCell>
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

ActivePools.defaultProps = {
    title: 'Default ActivePools component!'
}

export default ActivePools
