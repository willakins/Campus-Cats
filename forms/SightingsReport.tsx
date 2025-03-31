import { ScrollView, Text, View } from 'react-native';

import { doc } from 'firebase/firestore';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button, Errorbar } from '@/components';
import { auth, db } from '@/config/firebase';
import { ControlledDateTimeInput, ControlledFilePicker, ControlledInput, ControlledMapPicker } from './controls';
import { Sighting } from '@/models';
import { textStyles, containerStyles, buttonStyles } from '@/styles';
import { LatLngSchema } from '@/types';
import { uploadFromURI } from '@/utils';
import { useState } from 'react';

const reportSchema = z.object({
  name: z.string(),
  location: LatLngSchema,
  notes: z.string(),
  files: z.array(z.string()),
  timestamp: z.date(),
});

type ReportDataType = z.infer<typeof reportSchema>;

const sightingFormConverter = async (data: ReportDataType): Promise<Sighting> => {
  // Upload all files to storage and get their refs
  const sightingStoragePath = 'photos/';
  const uploadPromises = data.files.map((file) => uploadFromURI(sightingStoragePath, file));
  const storageUrls = (await Promise.all(uploadPromises)).map((upload) => upload.ref.name);

  // Get current user
  const userRef = auth.currentUser ? doc(db, 'users', auth.currentUser.uid) : null;

  // Transform the data to match Sighting schema
  const sightingData: Sighting = {
    user: userRef,
    name: data.name,
    timestamp: data.timestamp,
    files: storageUrls,
    latitude: data.location.latitude,
    longitude: data.location.longitude,
    info: data.notes,
  };

  return Sighting.parse(sightingData);
}

type ReportProps = {
  type: 'create' | 'edit' | 'view';
  onSubmit: (data: Sighting) => Promise<void>;
  defaultValues?: ReportDataType;
};

export const SightingReportForm: React.FC<ReportProps> = ({
  type,
  onSubmit,
  defaultValues,
}) => {
  const [error, setError] = useState<string>('');

  const { handleSubmit, control } = useForm<ReportDataType>({
    resolver: zodResolver(reportSchema),
    defaultValues: defaultValues,
  });

  const submitHandler = async (data: ReportDataType) => {
    try {
      const parsedData = await sightingFormConverter(data);
      await onSubmit(parsedData);
    } catch (err: unknown) {
      console.error('Error during upload:', err);
      setError(`Upload failed: ${(err as Error).message}`);
    }
  };

  return (
    <>
      {type !== 'view' ? <Button style={buttonStyles.editButton} onPress={handleSubmit(submitHandler)}>
        <Text style= {textStyles.editText}>
          {type === 'create' ? 'Submit Sighting' : null}
          {type === 'edit' ? 'Save' : null}
        </Text>
      </Button> : null}
      <ScrollView contentContainerStyle={containerStyles.scrollView}>
        <View style={containerStyles.container}>
          <Text style={textStyles.catalogTitle}>
            {type === 'create' ? 'Report A Sighting' : null}
            {type === 'edit' ? 'Edit A Sighting' : null}
            {type === 'view' ? 'View A Sighting' : null}
          </Text>
          <View style={containerStyles.inputContainer}>
            <ControlledMapPicker control={control} name="location" />
            <ControlledDateTimeInput control={control} name="timestamp" />
            <ControlledInput control={control} name="name"
              placeholder="Cat's name"
              placeholderTextColor="#888"
              style={textStyles.input}
            />
            <ControlledInput control={control} name="notes"
              placeholder="Additional Notes"
              placeholderTextColor="#888"
              style={textStyles.input}
            />
            <ControlledFilePicker control={control} name="files" />
          </View>
        </View>
      </ScrollView>
      <Errorbar error={error} onDismiss={() => setError('')} />
    </>
  );
};
