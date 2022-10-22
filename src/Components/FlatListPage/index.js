import { useState, useEffect, useCallback } from "react";
import {
  Keyboard,
  FlatList,
  View,
  TextInput,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  Modal,
} from "react-native";
import * as styles from "./styles";
import EmptyList from "./EmptyList";
import ItemContainer from "./ItemContainer";
import Toast from "react-native-toast-message";
import axios from "axios";
import colors from "../../../assets/colors";

Array.prototype.sortByStateByName = function () {
  const compare = (a, b) => (a.name > b.name ? 1 : a.name < b.name ? -1 : 0);
  const selected = this.filter((item) => item.isSelected).sort(compare);
  const notSelected = this.filter((item) => !item.isSelected).sort(compare);
  return [...notSelected, ...selected];
};

const FlatListPage = () => {
  const [data, setData] = useState([]);
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const source = axios.CancelToken.source();
  const instance = axios.create({
    baseURL: "http://10.0.2.2:3000",
    timeout: 1000,
    headers: {
      "content-type": "application/json;charset=utf-8",
    },
  });

  const selectedIds = useCallback(() => {
    return data.filter((item) => item.isSelected).map((item) => item.id);
  }, [data]);

  const handleSelectedIds = async (selectedId) => {
    if (data.find((element) => element.id === selectedId)) {
      let item;
      const newData = data
        .map((element) => {
          if (element.id === selectedId) {
            element.isSelected = !element.isSelected;
            item = element;
          }
          return element;
        })
        .sortByStateByName();
      setData(newData);
      await instance.patch(
        `/items/${selectedId}`,
        { isSelected: item.isSelected },
        { cancelToken: source.token }
      );
    }
  };

  const handleDeleteAll = async () => {
    instance.apply(
      { cancelToken: source.token },
      data.map((item) => instance.delete(`/items/${item.id}`))
    );
    setData([]);
    setModalVisible(false);
    Toast.show({
      type: "success",
      text1: "Data successfully deleted!",
      text2: `Now your list is empty.`,
      position: "bottom",
    });
  };

  const handleDelete = async (selectedId) => {
    if (!selectedId) {
      setModalVisible(true);
    } else {
      try {
        let item = data.find((element) => element.id === selectedId);
        await instance.delete(`/items/${selectedId}`, {
          cancelToken: source.token,
        });
        const newData = data
          .filter((element) => element.id !== selectedId)
          .sortByStateByName();
        setData(newData);
        Toast.show({
          type: "success",
          text1: "Successfully deleted!",
          text2: `Item "${item?.name}" deleted.`,
          position: "bottom",
        });
      } catch (error) {
        Toast.show({
          type: "error",
          text1: "Deletion Error.",
          text2: `${error.message}.`,
          position: "bottom",
        });
      }
    }
  };

  const handleAdd = async () => {
    try {
      if (name === "") {
        throw new Error("Item name is required!");
      }
      if (quantity === "") {
        throw new Error("Quantity is required!");
      }
      if (data.find((element) => element.name === name)) {
        throw new Error("Item already exists!");
      }
      const response = await instance.post(
        `/items`,
        { name, quantity, isSelected: false },
        { cancelToken: source.token }
      );
      const newData = [
        ...data,
        { id: response.data.id, name, quantity, isSelected: false },
      ].sortByStateByName();
      setData(newData);

      setName("");
      setQuantity("");
      Keyboard.dismiss();

      Toast.show({
        type: "success",
        text1: "Successfully registered!",
        text2: `Added ${quantity} of ${name}.`,
        position: "bottom",
      });
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Registration Error.",
        text2: `${error.message}.`,
        position: "bottom",
      });
    }
  };

  const renderItem = ({ item }) => {
    return (
      <ItemContainer
        item={item}
        onValueChange={() => handleSelectedIds(item.id)}
        onDelete={() => handleDelete(item.id)}
      />
    );
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await instance.get(`/items`, {
          cancelToken: source.token,
        });
        setData(response.data.sortByStateByName());
      } catch (error) {
        if (axios.isCancel(error)) {
          console.log("Request cancelled", error.message);
        } else {
          Toast.show({
            type: "error",
            text1: "Error loading Data.",
            text2: "The Data is corrupted! Please try again." + error.message,
            position: "bottom",
          });
        }
      } finally {
        setLoading(false);
      }
    };
    fetchData();

    return () => {
      source.cancel();
    };
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.addContainer}>
        <Text style={styles.text}>Shopping List</Text>
        <View style={styles.inputs}>
          <TextInput
            style={[styles.input, styles.inputName]}
            placeholder="Item name"
            value={name}
            onChangeText={(text) => setName(text)}
            keyboardType="default"
          />
          <TextInput
            style={[styles.input, styles.inputQuantity]}
            placeholder="100g"
            value={quantity}
            onChangeText={(text) => setQuantity(text)}
            keyboardType="numeric"
          />
        </View>
        <TouchableOpacity style={styles.button} onPress={() => handleAdd()}>
          <Text style={styles.buttonText}>Add to List</Text>
        </TouchableOpacity>
      </View>
      {loading ? (
        <View style={styles.listContainer}>
          <ActivityIndicator size="large" color={colors.secondary} />
        </View>
      ) : (
        <>
          <FlatList
            styles={{ flex: 1, height: "100%" }}
            data={data}
            onPress={(item) => handleSelectedIds(item.id)}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            extraData={selectedIds}
            ListEmptyComponent={<EmptyList />}
            horizontal={false}
          />
          {data.length > 0 && (
            <View style={styles.deleteContainer}>
              <TouchableOpacity
                style={[styles.button, styles.buttonDanger]}
                onPress={() => handleDelete()}
              >
                <Text style={styles.buttonText}>Delete All</Text>
              </TouchableOpacity>
            </View>
          )}
        </>
      )}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => {
          Alert.alert("Modal has been closed.");
          setModalVisible(!modalVisible);
        }}
      >
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
            <Text style={styles.modalText}>Delete all data?</Text>
            <View style={styles.buttonView}>
              <TouchableOpacity
                style={styles.buttonYes}
                onPress={() => handleDeleteAll()}
              >
                <Text style={styles.buttonText}>Yes</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.buttonNo}
                onPress={() => setModalVisible(!modalVisible)}
              >
                <Text style={styles.buttonText}>No</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default FlatListPage;
