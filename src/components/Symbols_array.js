import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';

function Symbols_array (props) {// or props.title
    try {
        return (
            <Paper sx={{ width: '70%', overflow: 'hidden',margin: "auto",marginTop: "20px",mb:"50px" } }>
                <h2 align="center"><font color="red">Symbols array</font></h2>
                <TableContainer sx={{ maxHeight: 550 }}>
                    <Table  stickyHeader aria-label="dense sticky table" size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>#</TableCell>
                                <TableCell>lpToken_address</TableCell>
                                <TableCell align="center">token0_symbol</TableCell>
                                <TableCell align="center">token1_symbol</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                        {props.array[2].map((pool,i) => (
                            <TableRow
                                key={pool.LP_address}
                            >
                                <TableCell>{i}</TableCell>
                                <TableCell component="th" >{pool.LP_address}</TableCell>
                                <TableCell align="center">{pool.token0_symbol}</TableCell>
                                <TableCell align="center">{pool.token1_symbol}</TableCell>
                      
                            </TableRow>
                        ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>
        )
    } catch (error) {
        // console.log(error)
        return <div>Loading...</div>
    }
}


Symbols_array.defaultProps = {
    title: "Default Symbols_array component!"
}

export default Symbols_array
