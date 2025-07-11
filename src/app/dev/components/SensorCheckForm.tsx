"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ParsedSensorData,
  ParsedSensorValue,

} from "./Reader/ParseSensorData";
import { useSensorStore } from "./SensorStore";
import { usePrinterStore } from "./printer/printer_settinsgs_store";
import { connectToPort, readDataFromPort } from "./Reader/HandleClick";
import MenuIcon from "@mui/icons-material/Menu";
import {
  AppBar,
  Avatar,
  Container,
  Divider,
  FormControl,
  Grid2,
  IconButton,
  InputLabel,
  Menu,
  Modal,
  SelectChangeEvent,
  Toolbar,
  Tooltip,
} from "@mui/material";
import { PrintSticker } from "./printer/printer_server_side";
import {
  Box,
  Button,
  Collapse,
  Typography,
  TextField,
  Checkbox,
  MenuItem,
  Paper,
  Select,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
//import deepEqual from "deep-equal";
import { useMutation, useQuery } from "@tanstack/react-query";
import { RightDecoder } from "./Reader/Get_Sensors_database_chace";
import { GetSensors } from "~/app/sensors/components/backend";
import { InsertintoDB, ProductionListWithoutId } from "./PrismaCode";
import Printer_settings from "./printer/Printer_settings";
import { logOut } from "~/server/LOGIN_LUCIA_ACTION/auth.action";
import { getCurrentSession } from "~/server/LOGIN_LUCIA_ACTION/session";

type ImportantSensorData = Record<
  string,
  {
    value: ParsedSensorValue;
    my_type: string;
    enum_values?: { value: number; mapped: string }[];
  }
>;

export function SensorCheckForm() {
  const portRef = useRef<SerialPort | null>(null);

  const selectedPrinter = usePrinterStore((state) => state.selectedPrinter);
  const sensor_parsers = useSensorStore((state) => state.current_decoder);
  const [showUnimportantParameters, setShowUnimportantParameters] =
    useState<boolean>(false);

  const current_sensor_index = useSensorStore(
    (state) => state.current_sensor_index
  );

  const current_sensor = useSensorStore((state) => {
    if (state.sensors.length !== 0)
      return state.sensors[state.current_sensor_index];
    else return undefined;
  });

  const dataforDB = {
    DeviceType: "string",
    dev_eui: "string",
    join_eui: "string",
    app_key: "string",
    lora_freq_reg: "string",
    SubBands: "string",
    device_hw_ver: "string",
    device_fw_ver: "string",
    CustomFWVersion: "string",
    lora_send_period: "string",
    lora_ack: "string",
    device_mov_thr: "string",
    orderNumber: 0,
  } satisfies ProductionListWithoutId;
  const all_sensors = useSensorStore((state) => state.sensors);

  const add_new_sensor = useSensorStore((state) => state.add_new_sensor);

  const set_sensor_data = useSensorStore((state) => state.set_sensor_data);

  const set_sensor_status = useSensorStore((state) => state.set_sensor_status);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [anchorElNav, setAnchorElNav] = useState<null | HTMLElement>(null);
  const [anchorElUser, setAnchorElUser] = useState<null | HTMLElement>(null);

  const handleDashboard = () => {
    setIsModalOpen(!isModalOpen);
  };

  const handleOpenNavMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorElNav(event.currentTarget);
  };

  const handleOpenUserMenu = (event: React.MouseEvent<HTMLElement>) => {

    setAnchorElUser(event.currentTarget);
  };

  const handleCloseNavMenu = () => {
    setAnchorElNav(null);
  };

  const handleCloseUserMenu = () => {
    setAnchorElUser(null);
  };

  const session = useQuery({
    queryKey: ["session"],
    queryFn: getCurrentSession,
  });


  const set_current_sensor_index = useSensorStore(
    (state) => state.set_current_sensor_index
  );

  const { data: sensors } = useQuery({
    queryKey: ["sensors"],
    queryFn: () => GetSensors(),
  });

  const onSubmit = async (data: ParsedSensorData, okay: boolean) => {
    console.log("onSubmit before", {
      all_sensors,
      current_sensor_index,
      current_sensor,
    });

    set_sensor_status(current_sensor_index, okay);

    set_sensor_data(current_sensor_index, data);

    console.log("onSubmit after", {
      all_sensors,
      current_sensor_index,
      current_sensor,
    });

    // set_current_sensor_index(current_sensor_index + 1);
    const uint_array = await GetDataFromSensor();
    if (!uint_array || !sensors) return;

    const decoder = RightDecoder(uint_array, sensors);
    if (!decoder) return;

    add_new_sensor(decoder, uint_array);
  };

  const GetDataFromSensor = async () => {
    try {
      if (!portRef.current) {
        portRef.current = await connectToPort();
      } else {
        console.log("Port is already connected.");
      }

      console.log("Port:", portRef.current);
      return readDataFromPort(portRef.current);
    } catch (error) {
      console.error("Failed to handle click:", error);
    }
  };

  useEffect(() => {
    useSensorStore.setState({ start_time: Date.now() });
  }, []);

  const insertIntoDatabaseMutation = useMutation({
    mutationKey: ["InsertintoDatabase"],
    mutationFn: () => InsertintoDB(dataforDB),
    onMutate: async () => {
      console.log("onMutate");
    },
    onError: (error) => {
      console.error("Error in InsertintoDB:", error);
    },
    onSuccess: (data) => {
      console.log("onSuccess", data);
    },
  });
  const [important_sensor_data, unimportant_sensor_data] = useMemo(() => {
    const important: ImportantSensorData = {};
    const unimportant: ImportantSensorData = {};
    console.log("sensor_parsers", sensor_parsers);
    console.log("current_sensor", current_sensor);
    console.log("Sensor parser: ", sensor_parsers);
    if (!current_sensor) return [important, unimportant];
    Object.entries(current_sensor.data).forEach(([key, value]) => {
      const parser = sensor_parsers.find(
        (parser) => parser.output.name === key
      );
      console.log(value, key);


      dataforDB.orderNumber = 0;


      if (!parser?.output) {
        console.error("Parser not found for key", key);
        return;
      }
      console.log("Key", key);
      if (key in dataforDB) {
        (dataforDB as Record<string, unknown>)[key] = typeof value === "string" ? value : String(value);
        console.log("Data for DB", value?.toString());
      }
      if (parser.output.important) {
        important[key] = {
          value,
          my_type: parser.output.type,
          enum_values: parser.output.enum_values,
        };
      } else {
        unimportant[key] = {
          value,
          my_type: parser.output.type,
          enum_values: parser.output.enum_values,
        };
      }
    });

    return [important, unimportant];
  }, [current_sensor, dataforDB, sensor_parsers]);


  function handleDynamicChange(name: string, value: ParsedSensorValue): void {
    if (!current_sensor) return;
    const new_data = { ...current_sensor.data, [name]: value };
    set_sensor_data(current_sensor_index, new_data);
  }

  async function handleSubmit(
    dataHandler: (data: ParsedSensorData) => Promise<void>
  ): Promise<void> {
    if (!current_sensor) {
      console.log("No current sensor", sensors);
      const uint_array = await GetDataFromSensor();
      if (!uint_array || !sensors) return;
      const decoder = RightDecoder(uint_array, sensors);
      console.log("Decoder", decoder);
      if (!decoder) return;

      add_new_sensor(decoder, uint_array);
      return;
    }
    dataHandler(current_sensor.data as ParsedSensorData)
      .then(async () => {

        set_sensor_data(
          current_sensor_index,
          current_sensor.data as ParsedSensorData
        );

        const uint_array = await GetDataFromSensor();
        if (!uint_array || !sensors) return;

        const decoder = RightDecoder(uint_array, sensors);
        if (!decoder) return;

        add_new_sensor(decoder, uint_array);
      })
      .catch((error) => {
        console.error("Error in data handler:", error);
      });
  }

  return (
    <><AppBar position="static" sx={{ backgroundColor: "#f5f5f5" }}>
      <Container maxWidth={false}>
        <Toolbar disableGutters>
          {/* <AdbIcon sx={{ display: { xs: 'none', md: 'flex' }, mr: 1, color: "black" }} />*/}
          <Typography
            variant="h6"
            noWrap
            component="a"
            href="#"
            sx={{
              mr: 2,
              display: { xs: "none", md: "flex" },
              fontFamily: "monospace",
              fontWeight: 700,
              letterSpacing: ".3rem",
              color: "black",
              textDecoration: "none",
            }}
          >
            SENZEMO
          </Typography>

          <Box sx={{ flexGrow: 1, display: { xs: "flex", md: "none" } }}>
            <IconButton
              size="large"
              aria-label="menu"
              aria-controls="menu-appbar"
              aria-haspopup="true"
              onClick={handleOpenNavMenu}
              color="inherit"
            >
              <MenuIcon sx={{ color: "black" }} />
            </IconButton>
            <Menu
              id="menu-appbar"
              anchorEl={anchorElNav}
              anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
              keepMounted
              transformOrigin={{ vertical: "top", horizontal: "left" }}
              open={Boolean(anchorElNav)}
              onClose={handleCloseNavMenu}
            ></Menu>
          </Box>

          <Typography
            variant="h5"
            noWrap
            component="a"
            href="#"
            sx={{
              mr: 2,
              display: { xs: "flex", md: "none" },
              flexGrow: 1,
              fontFamily: "monospace",
              fontWeight: 700,
              letterSpacing: ".3rem",
              color: "black",
              textDecoration: "none",
            }}
          >
            LOGO
          </Typography>


          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "10px 20px",
              flexGrow: 1,
            }}
          >
            <Button
              onClick={async () => {
                const uint_array = await GetDataFromSensor();
                if (!uint_array || !sensors) return;
                const decoder = RightDecoder(uint_array, sensors);
                if (!decoder) return;
                add_new_sensor(decoder, uint_array);
              }}
              sx={{
                backgroundColor: "#4CAF50",
                color: "white",
                padding: "10px 20px",
                border: "none",
                cursor: "pointer",
                "&:hover": {
                  backgroundColor: "#388e3c",
                },
              }}
            >
              Open Serial Port
            </Button>
          </Box>
          <Box sx={{ flexGrow: 0, display: "flex", alignItems: "center" }}>
            <Tooltip title="Open settings">
              <IconButton onClick={handleOpenUserMenu} sx={{ p: 0 }}>
                <Avatar alt="User Avatar" src={session.data?.user?.picture} />

              </IconButton>
            </Tooltip>
            <Typography sx={{ ml: 1, color: "black" }}>
              {session?.data?.user?.name ?? "User"}
            </Typography>

            <Menu
              sx={{ mt: "45px" }}
              id="menu-appbar"
              anchorEl={anchorElUser}
              anchorOrigin={{ vertical: "top", horizontal: "right" }}
              keepMounted
              transformOrigin={{ vertical: "top", horizontal: "right" }}
              open={Boolean(anchorElUser)}
              onClose={handleCloseUserMenu}
            >
              <MenuItem
                onClick={() => {
                  handleCloseUserMenu();
                  //handleAccount();
                }}
              >
                <Typography sx={{ textAlign: "center", color: "black" }}>
                  Account
                </Typography>
              </MenuItem>

              <MenuItem
                onClick={() => {
                  handleCloseUserMenu();
                  handleDashboard();
                }}
              >
                <Typography sx={{ textAlign: "center", color: "black" }}>
                  Printer Settings
                </Typography>
              </MenuItem>

              <Modal
                open={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                aria-labelledby="printer-settings-modal"
                aria-describedby="printer-settings-modal-description"
              >
                <Box
                  sx={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    bgcolor: "background.paper",
                    boxShadow: 24,
                    p: 4,
                    borderRadius: 2,
                    width: 400,
                  }}
                >
                  <Printer_settings onClose={() => setIsModalOpen(false)} />
                </Box>
              </Modal>

              <MenuItem
                onClick={async () => {
                  handleCloseUserMenu();
                  await logOut();
                }}
              >
                <Typography sx={{ textAlign: "center", color: "black" }}>
                  Logout
                </Typography>
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </Container>
    </AppBar><Paper elevation={3} sx={{ p: 3, borderRadius: 2 }}>
        <form>
          <Box
            sx={{
              mb: 2,
              p: 3,
              borderRadius: 2,
              backgroundColor: "white",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              minHeight: "200px",
              width: "100%",
              boxShadow: 3,
            }}
          >
            <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
              Key Parameters
            </Typography>
            <Box
              sx={{
                display: "flex",
                flexWrap: "wrap",
                gap: 3,
                justifyContent: "center",
                width: "100%",
              }}
            >
              {Object.entries(important_sensor_data).map(([key, value]) => (

                <Box
                  key={key}
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    backgroundColor: "background.paper",
                    border: "1px solid",
                    borderColor: "divider",
                    minWidth: "200px",
                    textAlign: "center",
                    boxShadow: 1,
                    "&:hover": {
                      boxShadow: 3,
                      transform: "scale(1.05)",
                      transition: "all 0.3s ease",
                    },
                  }}
                >
                  <DynamicFormComponent

                    my_key={key}
                    my_type={value.my_type}
                    value={value.value}
                    onValueChange={handleDynamicChange}
                    enum_values={value.enum_values} />
                </Box>
              ))}
            </Box>
          </Box>

          <Box sx={{ mb: 2 }}>
            <Button
              variant="text"
              size="small"
              endIcon={showUnimportantParameters ? (
                <ExpandLessIcon />
              ) : (
                <ExpandMoreIcon />
              )}
              onClick={() => setShowUnimportantParameters(!showUnimportantParameters)}
            >
              {showUnimportantParameters ? "Hide Details" : "Show Details"}
            </Button>

            <Collapse in={showUnimportantParameters}>
              <Grid2 container spacing={2} sx={{ mt: 1 }}>
                {Object.entries(unimportant_sensor_data).map(([key, value]) => (
                  <Grid2 size={{ xs: 12, sm: 6, md: 4 }} key={key}>
                    <DynamicFormComponent
                      my_key={key}
                      my_type={value.my_type}
                      value={value.value}
                      enum_values={value.enum_values}
                      onValueChange={handleDynamicChange} />
                  </Grid2>
                ))}
              </Grid2>
            </Collapse>
          </Box>

          <Divider sx={{ my: 3 }} />

          <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2 }}>
            <Button
              variant="contained"
              color="success"
              onClick={async () => {
                handleSubmit(async (data: ParsedSensorData) => {
                  console.log("funtion called");
                  try {
                    console.log("Tole ne dela");

                    set_sensor_status(current_sensor_index, true);
                    set_sensor_data(current_sensor_index, data);
                    console.log("Data submitted:");

                    await PrintSticker(
                      data.dev_eui as string,
                      data.family_id as number,
                      data.product_id as number,
                      selectedPrinter
                    );

                    const uint_array = await GetDataFromSensor();
                    if (!uint_array || !sensors) return;

                    const decoder = RightDecoder(uint_array, sensors);
                    if (!decoder) return;

                    add_new_sensor(decoder, uint_array);
                    insertIntoDatabaseMutation.mutate();
                    console.log("Data inserted into database");
                  } catch (error) {
                    console.error("Error in submission:", error);
                    throw error;
                  }
                });
              }}
              sx={{ flex: 1 }}
            >
              Accept
            </Button>

            {/* <Button
      variant="contained"
      color="error"
      href="/konec"
      onClick={async () => {
        console.log("Reprograme");
      }}
      sx={{ flex: 1 }}
    >
      Reprograme
    </Button> */}

            <Button
              variant="outlined"
              color="warning"
              onClick={() => handleSubmit((data: ParsedSensorData) => onSubmit(data, false))}
              sx={{ flex: 1 }}
            >
              Reject
            </Button>
          </Box>
        </form>
        <Box sx={{ display: "flex", justifyContent: "center", mt: 3 }}>
          <Button
            variant="contained"
            color="error"
            href="/konec"
            onClick={async () => {
              //await createFolderAndSpreadsheet();
              useSensorStore.setState({ end_time: Date.now() });
              set_current_sensor_index(0);
            }}
            sx={{ flex: 1, maxWidth: "200px" }}
          >
            Finish
          </Button>
        </Box>
      </Paper></>
  );
}

export function DynamicFormComponent({
  my_key,
  my_type,
  value,
  enum_values,
  onValueChange,
}: {
  my_key: string;
  my_type: string;
  value: ParsedSensorValue;
  enum_values?: { value: number; mapped: string }[];
  onValueChange: (name: string, value: ParsedSensorValue) => void;
}) {
  const handleChange = (
    e:
      | React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
      | SelectChangeEvent<unknown>
  ) => {
    let value: ParsedSensorValue = e.target.value as ParsedSensorValue;

    if (my_type === "number") {
      value = Number(value);
    } else if (my_type === "boolean") {
      value = (e.target as HTMLInputElement).checked;
    }

    onValueChange(my_key, value);
  };

  return (
    <FormControl fullWidth>
      {my_type === "boolean" ? (
        <Box display="flex" alignItems="center">
          <Checkbox
            checked={Boolean(value)}
            onChange={handleChange}
            color="primary"
            sx={{ backgroundColor: getStatusColor2(my_key, value) }}
          />
          <InputLabel>{my_key}</InputLabel>
        </Box>
      ) : my_type === "number" ? (
        <TextField
          label={my_key}
          type="number"
          value={value}
          onChange={handleChange}
          sx={{ backgroundColor: getStatusColor2(my_key, value) }}
        />
      ) : my_type === "string" ? (
        <TextField
          label={my_key}
          value={value}
          onChange={handleChange}
          slotProps={{
            input: {
              readOnly: my_key === "join_eui",
            },
          }}
          sx={{ backgroundColor: getStatusColor2(my_key, value) }}
        />
      ) : my_type === "enum" && enum_values ? (
        (() => {
          let primerjator = 0;
          switch (value) {
            case "EU868":
              primerjator = 5;
              break;
            case "US915":
              primerjator = 8;
              break;
            case "AS923":
              primerjator = 3;
              break;
            default:
              break;
          }

          return (
            <FormControl fullWidth sx={{ backgroundColor: getStatusColor2(my_key, primerjator) }}>
              <InputLabel>{my_key}</InputLabel>
              <Select
                label={my_key}
                value={
                  typeof value === "number"
                    ? value
                    : enum_values.find((item) =>
                      (typeof value === "string" && item.mapped === value) ||
                      (typeof value === "number" && item.value === value)
                    )?.value ?? ""
                }
                onChange={handleChange}
              >
                {enum_values.map((item) => (
                  <MenuItem key={item.value} value={item.value}>
                    {item.mapped}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          );
        })()
      ) : (
        <Typography color="error">Invalid type: {my_type}</Typography>
      )}
    </FormControl>
  );
}


function getStatusColor2(
  name: string,
  vrednost: ParsedSensorValue,
): string {
  const target = useSensorStore.getState().target_sensor_data;
  if (!target) {
    return "white";
  }
  if (name === "dev_eui" || name === "join_eui" || name === "app_key") {
    return "white";
  }

  for (const [key, value] of Object.entries(target)) {


    if (name === key && value === vrednost) {
      return "white";
    }
  }
  console.log("Name", name, "Vrednost", vrednost, "Target", target);

  return "red";
}

