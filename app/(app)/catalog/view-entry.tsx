import { SafeAreaView, ScrollView, Text, View } from 'react-native';

import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Button, CatalogEntry, IconButton } from '@/components';
import { useAuth } from '@/providers';
import { globalStyles, buttonStyles, textStyles, containerStyles } from '@/styles';

const view_entry = () =>{
  const { signOut, user } = useAuth();
  const isAdmin = user.role === 1 || user.role === 2;
  const router = useRouter();
  const { id, name, descShort, descLong, colorPattern, behavior, yearsRecorded, AoR, currentStatus, furLength, furPattern, tnr, sex, credits} = useLocalSearchParams() as 
        { id: string, name: string, descShort: string, descLong: string, colorPattern: string, behavior: string, yearsRecorded: string, AoR: string, currentStatus: string, 
          furLength: string, furPattern: string, tnr: string, sex: string, credits:string};

  return (
    <SafeAreaView style={containerStyles.wrapper}>
      <Button style={buttonStyles.smallButtonTopLeft} onPress={() => router.navigate('/catalog')}>
        <Ionicons name="arrow-back-outline" size={25} color="#fff" />
      </Button>
      {isAdmin ? <Button style={buttonStyles.editButton} onPress={() => router.push({
        pathname: '/catalog/edit-entry',
        params: { id:id, name:name, descShort:descShort, descLong:descLong, colorPattern:colorPattern, behavior:behavior, yearsRecorded:yearsRecorded, AoR:AoR, currentStatus:currentStatus,
                  furLength:furLength, furPattern:furPattern, tnr:tnr, sex:sex, credits:credits},
      })}>
        <Text style ={textStyles.editText}> Edit Entry</Text>
      </Button> : null}
      <CatalogEntry
          id={id}
          name={name}
          descShort={descShort}
          descLong={descLong}
          colorPattern={colorPattern}
          behavior={behavior}
          yearsRecorded={yearsRecorded}
          AoR={AoR}
          currentStatus={currentStatus}
          furLength={furLength}
          furPattern={furPattern}
          tnr={tnr}
          sex={sex}
          credits={credits}
        />
    </SafeAreaView>
  );
}
export default view_entry;